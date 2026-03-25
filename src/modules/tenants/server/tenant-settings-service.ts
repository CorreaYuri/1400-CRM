import "server-only";
import type { Prisma, TicketOrigin, TicketPriority } from "@prisma/client";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { db } from "@/server/db";

export type TenantSettingsOverview = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  notificationSenderName: string | null;
  notificationSenderEmail: string | null;
  defaultTicketPriority: TicketPriority;
  allowedTicketOrigins: TicketOrigin[];
  closureReasons: string[];
  createdAt: string;
  updatedAt: string;
  activeUsers: number;
  activeInboxes: number;
  openTickets: number;
};

export type UpdateTenantSettingsInput = {
  name: string;
  slug: string;
  logoUrl?: string;
  notificationSenderName?: string;
  notificationSenderEmail?: string;
  defaultTicketPriority: TicketPriority;
  allowedTicketOrigins: TicketOrigin[];
  closureReasons: string[];
};

export type TenantTicketCreationSettings = {
  defaultPriority: TicketPriority;
  allowedOrigins: TicketOrigin[];
};

export type TenantClosureReasonSettings = {
  closureReasons: string[];
};

const OPEN_TICKET_STATUSES = ["NEW", "QUEUED", "IN_PROGRESS", "WAITING_RETURN", "WAITING_OTHER_TEAM"] as const;
const ALL_TICKET_ORIGINS: TicketOrigin[] = ["INTERNAL", "CUSTOMER_PORTAL", "EMAIL", "WHATSAPP", "API"];

export async function getTenantSettingsOverview(tenantId: string): Promise<TenantSettingsOverview | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      notificationSenderName: true,
      notificationSenderEmail: true,
      defaultTicketPriority: true,
      allowedTicketOrigins: true,
      closureReasons: true,
      createdAt: true,
      updatedAt: true,
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
                in: [...OPEN_TICKET_STATUSES],
              },
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    notificationSenderName: tenant.notificationSenderName,
    notificationSenderEmail: tenant.notificationSenderEmail,
    defaultTicketPriority: tenant.defaultTicketPriority,
    allowedTicketOrigins: tenant.allowedTicketOrigins,
    closureReasons: tenant.closureReasons,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
    activeUsers: tenant._count.users,
    activeInboxes: tenant._count.inboxes,
    openTickets: tenant._count.tickets,
  };
}

export async function getTenantTicketCreationSettings(tenantId: string): Promise<TenantTicketCreationSettings> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      defaultTicketPriority: true,
      allowedTicketOrigins: true,
    },
  });

  return {
    defaultPriority: tenant?.defaultTicketPriority ?? "MEDIUM",
    allowedOrigins: tenant?.allowedTicketOrigins?.length ? tenant.allowedTicketOrigins : ALL_TICKET_ORIGINS,
  };
}

export async function getTenantClosureReasons(tenantId: string): Promise<TenantClosureReasonSettings> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      closureReasons: true,
    },
  });

  return {
    closureReasons: tenant?.closureReasons?.length
      ? tenant.closureReasons
      : ["Resolvido", "Solicitacao atendida", "Sem retorno do solicitante"],
  };
}

export async function updateTenantSettings(tenantId: string, actorUserId: string, input: UpdateTenantSettingsInput) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      notificationSenderName: true,
      notificationSenderEmail: true,
      defaultTicketPriority: true,
      allowedTicketOrigins: true,
      closureReasons: true,
    },
  });

  if (!tenant) {
    return {
      ok: false as const,
      status: 404,
      error: "Tenant nao encontrado.",
    };
  }

  const normalizedName = input.name.trim();
  const normalizedSlug = normalizeSlug(input.slug);
  const normalizedLogoUrl = normalizeOptionalValue(input.logoUrl);
  const normalizedSenderName = normalizeOptionalValue(input.notificationSenderName);
  const normalizedSenderEmail = normalizeOptionalValue(input.notificationSenderEmail)?.toLowerCase() ?? null;
  const normalizedAllowedOrigins = Array.from(new Set(input.allowedTicketOrigins)).filter((origin): origin is TicketOrigin =>
    ALL_TICKET_ORIGINS.includes(origin),
  );
  const normalizedClosureReasons = Array.from(
    new Set(input.closureReasons.map((reason) => reason.trim()).filter((reason) => reason.length >= 3)),
  );

  if (!normalizedName || normalizedName.length < 2) {
    return {
      ok: false as const,
      status: 400,
      error: "Informe um nome valido para o tenant.",
    };
  }

  if (!normalizedSlug || normalizedSlug.length < 3) {
    return {
      ok: false as const,
      status: 400,
      error: "Informe um slug valido para o tenant.",
    };
  }

  if (!normalizedAllowedOrigins.length) {
    return {
      ok: false as const,
      status: 400,
      error: "Selecione ao menos uma origem habilitada para o tenant.",
    };
  }

  const existingTenant = await db.tenant.findFirst({
    where: {
      slug: normalizedSlug,
      id: {
        not: tenant.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingTenant) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe outro tenant com este slug.",
    };
  }

  const updated = await db.tenant.update({
    where: { id: tenant.id },
    data: {
      name: normalizedName,
      slug: normalizedSlug,
      logoUrl: normalizedLogoUrl,
      notificationSenderName: normalizedSenderName,
      notificationSenderEmail: normalizedSenderEmail,
      defaultTicketPriority: input.defaultTicketPriority,
      allowedTicketOrigins: normalizedAllowedOrigins,
      closureReasons: normalizedClosureReasons,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      notificationSenderName: true,
      notificationSenderEmail: true,
      defaultTicketPriority: true,
      allowedTicketOrigins: true,
      closureReasons: true,
      updatedAt: true,
    },
  });

  await logAuditEvent({
    tenantId: tenant.id,
    userId: actorUserId,
    entityType: "TENANT",
    entityId: tenant.id,
    action: "TENANT_UPDATED",
    payload: {
      previous: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        notificationSenderName: tenant.notificationSenderName,
        notificationSenderEmail: tenant.notificationSenderEmail,
        defaultTicketPriority: tenant.defaultTicketPriority,
        allowedTicketOrigins: tenant.allowedTicketOrigins,
        closureReasons: tenant.closureReasons,
      },
      next: {
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl,
        notificationSenderName: updated.notificationSenderName,
        notificationSenderEmail: updated.notificationSenderEmail,
        defaultTicketPriority: updated.defaultTicketPriority,
        allowedTicketOrigins: updated.allowedTicketOrigins,
        closureReasons: updated.closureReasons,
      },
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Configuracoes do tenant atualizadas com sucesso.",
    },
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeOptionalValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

