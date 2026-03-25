import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { env } from "@/server/env";

export const SESSION_COOKIE_NAME = "crm1400_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
};

type SessionSupportContext = {
  originalUser: SessionUser;
  targetTenant: {
    id: string;
    name: string;
    slug: string;
  };
  enteredAt: string;
};

type SessionPayload = {
  user: SessionUser;
  support?: SessionSupportContext;
  exp: number;
};

export type AuthSession = SessionPayload;
export type AllowedRole = UserRole | UserRole[];
export type AuthSessionUser = SessionUser;
export type AuthSessionSupportContext = SessionSupportContext;

export async function createSessionToken(input: SessionUser, support?: SessionSupportContext) {
  const payload: SessionPayload = {
    user: input,
    ...(support ? { support } : {}),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function setSessionCookie(input: SessionUser, support?: SessionSupportContext) {
  const token = await createSessionToken(input, support);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requirePageSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiSession() {
  return getSession();
}

export function hasRole(session: AuthSession, allowedRoles: AllowedRole) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(session.user.role);
}

export async function requirePageRole(allowedRoles: AllowedRole) {
  const session = await requirePageSession();

  if (!hasRole(session, allowedRoles)) {
    redirect("/");
  }

  return session;
}

export async function requireApiRole(allowedRoles: AllowedRole) {
  const session = await requireApiSession();

  if (!session) {
    return {
      ok: false as const,
      status: 401,
      error: "Nao autenticado.",
    };
  }

  if (!hasRole(session, allowedRoles)) {
    return {
      ok: false as const,
      status: 403,
      error: "Voce nao tem permissao para executar esta acao.",
    };
  }

  return {
    ok: true as const,
    session,
  };
}

function verifySessionToken(token: string) {
  const [payloadPart, signaturePart] = token.split(".");

  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = sign(payloadPart);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signaturePart);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function shouldUseSecureCookies() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");

  if (host && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return false;
  }

  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  if (origin) {
    return origin.startsWith("https://");
  }

  if (host) {
    return true;
  }

  return false;
}

function sign(payload: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}
