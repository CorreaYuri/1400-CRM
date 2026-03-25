import "server-only";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { db } from "@/server/db";
import { env } from "@/server/env";
import {
  requireApiSession,
  requirePageSession,
  setSessionCookie,
  type AuthSession,
} from "@/server/auth/session";

function getPlatformAdminEmails() {
  return new Set(
    (env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminEmail(email: string) {
  return getPlatformAdminEmails().has(email.trim().toLowerCase());
}

export function isPlatformAdminSession(session: AuthSession) {
  return isPlatformAdminEmail(session.user.email);
}

export async function requirePlatformPageSession() {
  const session = await requirePageSession();

  if (!isPlatformAdminSession(session)) {
    redirect("/");
  }

  return session;
}

export async function requirePlatformApiSession() {
  const session = await requireApiSession();

  if (!session) {
    return {
      ok: false as const,
      status: 401,
      error: "Nao autenticado.",
    };
  }

  if (!isPlatformAdminSession(session)) {
    return {
      ok: false as const,
      status: 403,
      error: "Area restrita para a equipe da plataforma.",
    };
  }

  return {
    ok: true as const,
    session,
  };
}

export function isPlatformSupportSession(session: AuthSession) {
  return Boolean(session.support);
}

export async function enterPlatformSupportTenant(session: AuthSession, tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  if (!tenant) {
    return {
      ok: false as const,
      status: 404,
      error: "Tenant nao encontrado.",
    };
  }

  if (!tenant.isActive) {
    return {
      ok: false as const,
      status: 400,
      error: "Este tenant esta desativado e nao pode ser aberto em modo suporte.",
    };
  }

  const originalUser = session.support?.originalUser ?? session.user;
  const supportContext = {
    originalUser,
    targetTenant: tenant,
    enteredAt: new Date().toISOString(),
  };

  await logAuditEvent({
    tenantId: tenant.id,
    userId: originalUser.id,
    entityType: "TENANT",
    entityId: tenant.id,
    action: "PLATFORM_SUPPORT_ENTERED",
    payload: {
      actorEmail: originalUser.email,
      actorName: originalUser.name,
      sourceTenantId: originalUser.tenantId,
      targetTenantId: tenant.id,
      targetTenantName: tenant.name,
      targetTenantSlug: tenant.slug,
      enteredAt: supportContext.enteredAt,
      previousSupportTenantId: session.support?.targetTenant.id ?? null,
    },
  });

  await setSessionCookie(
    {
      ...session.user,
      tenantId: tenant.id,
      role: "ADMIN",
    },
    supportContext,
  );

  return {
    ok: true as const,
    status: 200,
    data: {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    },
  };
}

export async function exitPlatformSupportTenant(session: AuthSession) {
  if (!session.support) {
    return {
      ok: false as const,
      status: 400,
      error: "A sessao atual nao esta em modo suporte.",
    };
  }

  await logAuditEvent({
    tenantId: session.support.targetTenant.id,
    userId: session.support.originalUser.id,
    entityType: "TENANT",
    entityId: session.support.targetTenant.id,
    action: "PLATFORM_SUPPORT_EXITED",
    payload: {
      actorEmail: session.support.originalUser.email,
      actorName: session.support.originalUser.name,
      sourceTenantId: session.support.originalUser.tenantId,
      targetTenantId: session.support.targetTenant.id,
      targetTenantName: session.support.targetTenant.name,
      targetTenantSlug: session.support.targetTenant.slug,
      enteredAt: session.support.enteredAt,
      exitedAt: new Date().toISOString(),
    },
  });

  await setSessionCookie(session.support.originalUser);

  return {
    ok: true as const,
    status: 200,
    data: {
      tenantId: session.support.originalUser.tenantId,
    },
  };
}
