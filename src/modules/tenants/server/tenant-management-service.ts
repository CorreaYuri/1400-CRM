import "server-only";
import { UserRole } from "@prisma/client";
import { db } from "@/server/db";
import { logAuditEvent } from "@/modules/audit/server/audit-service";

export type TenantManagementSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  isCurrentTenant: boolean;
  activeUsersCount: number;
  activeInboxesCount: number;
  openTicketsCount: number;
  primaryAdminName: string | null;
  primaryAdminEmail: string | null;
  primaryAdminLastLoginAt: Date | null;
};

type TenantOverviewRecord = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  users: Array<{
    id: string;
    name: string;
    email: string;
    lastLoginAt: Date | null;
  }>;
  _count: {
    users: number;
    inboxes: number;
    tickets: number;
  };
};

const CLOSED_TICKET_STATUSES = ["CLOSED", "CANCELED"] as const;

export async function getTenantManagementOverview(currentTenantId: string) {
  const tenants: TenantOverviewRecord[] = await db.tenant.findMany({
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createdAt: true,
      users: {
        where: {
          role: UserRole.ADMIN,
          isActive: true,
        },
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
        },
      },
      _count: {
        select: {
          users: {
            where: {
              isActive: true,
            },
          },
          inboxes: {
            where: {
              isActive: true,
            },
          },
          tickets: {
            where: {
              status: {
                notIn: [...CLOSED_TICKET_STATUSES],
              },
            },
          },
        },
      },
    },
  });

  return tenants.map((tenant: TenantOverviewRecord) => {
    const [primaryAdmin] = tenant.users;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      isCurrentTenant: tenant.id === currentTenantId,
      activeUsersCount: tenant._count.users,
      activeInboxesCount: tenant._count.inboxes,
      openTicketsCount: tenant._count.tickets,
      primaryAdminName: primaryAdmin?.name ?? null,
      primaryAdminEmail: primaryAdmin?.email ?? null,
      primaryAdminLastLoginAt: primaryAdmin?.lastLoginAt ?? null,
    } satisfies TenantManagementSummary;
  });
}

export async function setTenantActiveStatus(tenantId: string, actorUserId: string, isActive: boolean, currentTenantId: string) {
  if (tenantId === currentTenantId) {
    return {
      ok: false as const,
      status: 400,
      error: isActive
        ? "Este tenant ja esta na sua sessao atual."
        : "Nao e permitido desativar o tenant da sua sessao atual.",
    };
  }

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

  if (tenant.isActive === isActive) {
    return {
      ok: false as const,
      status: 400,
      error: isActive ? "Este tenant ja esta ativo." : "Este tenant ja esta desativado.",
    };
  }

  const updated = await db.tenant.update({
    where: { id: tenant.id },
    data: { isActive },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  await logAuditEvent({
    tenantId: tenant.id,
    userId: actorUserId,
    entityType: "TENANT",
    entityId: tenant.id,
    action: isActive ? "TENANT_REACTIVATED" : "TENANT_DEACTIVATED",
    payload: {
      tenantName: updated.name,
      tenantSlug: updated.slug,
      previousIsActive: tenant.isActive,
      nextIsActive: updated.isActive,
    },
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: isActive
        ? `Tenant ${updated.name} reativado com sucesso.`
        : `Tenant ${updated.name} desativado com sucesso.`,
    },
  };
}

export async function deleteTenant(tenantId: string, actorUserId: string, currentTenantId: string) {
  if (tenantId === currentTenantId) {
    return {
      ok: false as const,
      status: 400,
      error: "Nao e permitido apagar o tenant da sua sessao atual.",
    };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          tickets: true,
          users: true,
          inboxes: true,
        },
      },
    },
  });

  if (!tenant) {
    return {
      ok: false as const,
      status: 404,
      error: "Tenant nao encontrado.",
    };
  }

  await logAuditEvent({
    tenantId: tenant.id,
    userId: actorUserId,
    entityType: "TENANT",
    entityId: tenant.id,
    action: "TENANT_DELETED",
    payload: {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      usersCount: tenant._count.users,
      inboxesCount: tenant._count.inboxes,
      ticketsCount: tenant._count.tickets,
    },
  });

  await db.tenant.delete({
    where: { id: tenant.id },
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: `Tenant ${tenant.name} apagado com sucesso.`,
    },
  };
}
