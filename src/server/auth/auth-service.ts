import "server-only";
import type { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { setSessionCookie } from "@/server/auth/session";

type AuthenticatedUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  tenant: {
    name: string;
    isActive: boolean;
  };
};

export async function authenticateUser(email: string, password: string, tenantSlug?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedTenantSlug = tenantSlug?.trim().toLowerCase();

  if (normalizedTenantSlug) {
    const user = await db.user.findFirst({
      where: {
        email: normalizedEmail,
        isActive: true,
        tenant: {
          slug: normalizedTenantSlug,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return {
        ok: false as const,
        status: 401,
        error: "Tenant, email ou senha invalidos.",
      };
    }

    if (!user.tenant.isActive) {
      return {
        ok: false as const,
        status: 403,
        error: "Este tenant esta desativado no momento.",
      };
    }

    return establishAuthenticatedSession(user);
  }

  const users = await db.user.findMany({
    where: {
      email: normalizedEmail,
      isActive: true,
      tenant: {
        isActive: true,
      },
    },
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (users.length === 0) {
    return {
      ok: false as const,
      status: 401,
      error: "Email ou senha invalidos.",
    };
  }

  if (users.length > 1) {
    return {
      ok: false as const,
      status: 409,
      error: "Este email existe em mais de um tenant. Informe o slug do tenant para continuar.",
    };
  }

  const [user] = users;

  if (!verifyPassword(password, user.passwordHash)) {
    return {
      ok: false as const,
      status: 401,
      error: "Email ou senha invalidos.",
    };
  }

  return establishAuthenticatedSession(user);
}

async function establishAuthenticatedSession(user: AuthenticatedUser) {
  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await setSessionCookie({
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      id: user.id,
      name: user.name,
      tenant: user.tenant.name,
      role: user.role,
    },
  };
}
