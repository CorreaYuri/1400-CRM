import "server-only";
import type { Prisma } from "@prisma/client";
import type { InboxOption, InboxOverview } from "@/modules/tickets/server/types";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { db } from "@/server/db";
import { getAccessibleInboxIds, resolveAccessActor } from "@/server/auth/access";

export type ManageInboxInput = {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  firstResponseSlaMinutes?: number | null;
  resolutionSlaHours?: number | null;
};

export type InboxMemberOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export type InboxManagementItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  queueCount: number;
  membershipCount: number;
  memberIds: string[];
  memberNames: string[];
  firstResponseSlaMinutes: number | null;
  resolutionSlaHours: number | null;
  createdAt: string;
};

export type InboxManagementData = {
  inboxes: InboxManagementItem[];
  users: InboxMemberOption[];
};

const OPEN_TICKET_STATUSES = ["NEW", "QUEUED", "IN_PROGRESS", "WAITING_RETURN", "WAITING_OTHER_TEAM"] as const;

export async function getInboxes(actorUserId?: string): Promise<InboxOverview[]> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return [];
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const inboxes = await db.inbox.findMany({
    where: {
      tenantId: actor.tenantId,
      ...(accessibleInboxIds ? { id: { in: accessibleInboxIds } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      name: true,
      firstResponseSlaMinutes: true,
      resolutionSlaHours: true,
      _count: {
        select: {
          memberships: true,
          tickets: {
            where: {
              status: {
                in: OPEN_TICKET_STATUSES,
              },
            },
          },
        },
      },
    },
  });

  return inboxes.map((inbox: (typeof inboxes)[number]) => ({
    name: inbox.name,
    queue: String(inbox._count.tickets),
    team: `${inbox._count.memberships} atendentes`,
    sla: formatInboxSla(inbox.firstResponseSlaMinutes, inbox.resolutionSlaHours),
  }));
}

export async function getInboxManagementData(tenantId: string): Promise<InboxManagementData> {
  const [inboxes, users] = await Promise.all([
    db.inbox.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        firstResponseSlaMinutes: true,
        resolutionSlaHours: true,
        createdAt: true,
        memberships: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        },
        _count: {
          select: {
            memberships: true,
            tickets: {
              where: {
                status: {
                  in: OPEN_TICKET_STATUSES,
                },
              },
            },
          },
        },
      },
    }),
    db.user.findMany({
      where: { tenantId },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  return {
    inboxes: inboxes.map((inbox: (typeof inboxes)[number]): InboxManagementItem => ({
      id: inbox.id,
      name: inbox.name,
      code: inbox.code,
      description: inbox.description ?? "",
      isActive: inbox.isActive,
      queueCount: inbox._count.tickets,
      membershipCount: inbox._count.memberships,
      memberIds: inbox.memberships.map((membership: (typeof inbox.memberships)[number]) => membership.user.id),
      memberNames: inbox.memberships.map((membership: (typeof inbox.memberships)[number]) => membership.user.name),
      firstResponseSlaMinutes: inbox.firstResponseSlaMinutes ?? null,
      resolutionSlaHours: inbox.resolutionSlaHours ?? null,
      createdAt: inbox.createdAt.toISOString(),
    })),
    users: users.map((user: (typeof users)[number]): InboxMemberOption => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })),
  };
}

export async function createInbox(tenantId: string, actorUserId: string, input: ManageInboxInput) {
  const normalizedName = input.name.trim();
  const normalizedCode = input.code.trim().toUpperCase();
  const normalizedDescription = normalizeOptionalField(input.description);

  const existingInbox = await db.inbox.findFirst({
    where: {
      tenantId,
      OR: [
        { code: normalizedCode },
        { name: { equals: normalizedName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (existingInbox) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe uma inbox com esse nome ou codigo neste tenant.",
    };
  }

  const inbox = await db.inbox.create({
    data: {
      tenantId,
      name: normalizedName,
      code: normalizedCode,
      description: normalizedDescription,
      isActive: input.isActive,
      firstResponseSlaMinutes: normalizeSlaValue(input.firstResponseSlaMinutes),
      resolutionSlaHours: normalizeSlaValue(input.resolutionSlaHours),
    },
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "INBOX",
    entityId: inbox.id,
    action: "INBOX_CREATED",
    payload: {
      name: inbox.name,
      code: inbox.code,
      description: inbox.description,
      isActive: inbox.isActive,
      firstResponseSlaMinutes: inbox.firstResponseSlaMinutes,
      resolutionSlaHours: inbox.resolutionSlaHours,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 201,
    data: {
      message: "Inbox criada com sucesso.",
    },
  };
}

export async function updateInbox(tenantId: string, actorUserId: string, inboxId: string, input: ManageInboxInput) {
  const inbox = await db.inbox.findFirst({
    where: {
      id: inboxId,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      isActive: true,
      firstResponseSlaMinutes: true,
      resolutionSlaHours: true,
    },
  });

  if (!inbox) {
    return {
      ok: false as const,
      status: 404,
      error: "Inbox nao encontrada.",
    };
  }

  const normalizedName = input.name.trim();
  const normalizedCode = input.code.trim().toUpperCase();
  const normalizedDescription = normalizeOptionalField(input.description);

  const existingInbox = await db.inbox.findFirst({
    where: {
      tenantId,
      id: { not: inbox.id },
      OR: [
        { code: normalizedCode },
        { name: { equals: normalizedName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (existingInbox) {
    return {
      ok: false as const,
      status: 409,
      error: "Ja existe outra inbox com esse nome ou codigo neste tenant.",
    };
  }

  if (!input.isActive) {
    const openTickets = await db.ticket.count({
      where: {
        inboxId: inbox.id,
        status: {
          in: OPEN_TICKET_STATUSES,
        },
      },
    });

    if (openTickets > 0) {
      return {
        ok: false as const,
        status: 400,
        error: "Nao e possivel desativar uma inbox com chamados abertos.",
      };
    }
  }

  await db.inbox.update({
    where: { id: inbox.id },
    data: {
      name: normalizedName,
      code: normalizedCode,
      description: normalizedDescription,
      isActive: input.isActive,
      firstResponseSlaMinutes: normalizeSlaValue(input.firstResponseSlaMinutes),
      resolutionSlaHours: normalizeSlaValue(input.resolutionSlaHours),
    },
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "INBOX",
    entityId: inbox.id,
    action: "INBOX_UPDATED",
    payload: {
      previous: {
        name: inbox.name,
        code: inbox.code,
        description: inbox.description,
        isActive: inbox.isActive,
        firstResponseSlaMinutes: inbox.firstResponseSlaMinutes,
        resolutionSlaHours: inbox.resolutionSlaHours,
      },
      next: {
        name: normalizedName,
        code: normalizedCode,
        description: normalizedDescription,
        isActive: input.isActive,
        firstResponseSlaMinutes: normalizeSlaValue(input.firstResponseSlaMinutes),
        resolutionSlaHours: normalizeSlaValue(input.resolutionSlaHours),
      },
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Inbox atualizada com sucesso.",
    },
  };
}

export async function archiveInbox(tenantId: string, actorUserId: string, inboxId: string) {
  const inbox = await db.inbox.findFirst({
    where: {
      id: inboxId,
      tenantId,
    },
    include: {
      memberships: {
        select: { userId: true },
      },
    },
  });

  if (!inbox) {
    return {
      ok: false as const,
      status: 404,
      error: "Inbox nao encontrada.",
    };
  }

  const openTickets = await db.ticket.count({
    where: {
      inboxId: inbox.id,
      status: {
        in: OPEN_TICKET_STATUSES,
      },
    },
  });

  if (openTickets > 0) {
    return {
      ok: false as const,
      status: 400,
      error: "Nao e possivel arquivar uma inbox com chamados abertos.",
    };
  }

  await db.inbox.update({
    where: { id: inbox.id },
    data: { isActive: false },
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "INBOX",
    entityId: inbox.id,
    action: "INBOX_ARCHIVED",
    payload: {
      name: inbox.name,
      code: inbox.code,
      removedMembershipCount: inbox.memberships.length,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: "Inbox arquivada com sucesso.",
    },
  };
}

export async function updateInboxMemberships(tenantId: string, actorUserId: string, inboxId: string, userIds: string[]) {
  const [inbox, users] = await Promise.all([
    db.inbox.findFirst({
      where: {
        id: inboxId,
        tenantId,
      },
      include: {
        memberships: {
          select: { userId: true },
        },
      },
    }),
    db.user.findMany({
      where: {
        tenantId,
        id: { in: userIds },
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  if (!inbox) {
    return {
      ok: false as const,
      status: 404,
      error: "Inbox nao encontrada.",
    };
  }

  if (!inbox.isActive) {
    return {
      ok: false as const,
      status: 400,
      error: "Nao e possivel vincular membros a uma inbox inativa.",
    };
  }

  if (users.length !== userIds.length) {
    return {
      ok: false as const,
      status: 400,
      error: "Um ou mais usuarios selecionados sao invalidos ou estao inativos.",
    };
  }

  await db.$transaction(async (tx) => {
    const transaction = tx as Prisma.TransactionClient & { inboxMembership: typeof db.inboxMembership };

    await transaction.inboxMembership.deleteMany({
      where: {
        inboxId: inbox.id,
      },
    });

    if (userIds.length > 0) {
      await transaction.inboxMembership.createMany({
        data: userIds.map((userId) => ({
          inboxId: inbox.id,
          userId,
        })),
      });
    }
  });

  await logAuditEvent({
    tenantId,
    userId: actorUserId,
    entityType: "INBOX",
    entityId: inbox.id,
    action: "INBOX_MEMBERS_UPDATED",
    payload: {
      previousUserIds: inbox.memberships.map((membership: (typeof inbox.memberships)[number]) => membership.userId),
      nextUserIds: userIds,
    } satisfies Prisma.InputJsonObject,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      message: userIds.length === 0 ? "Inbox sem membros vinculados." : `Inbox vinculada a ${userIds.length} usuario(s).`,
    },
  };
}

export async function getInboxOptions(actorUserId?: string): Promise<InboxOption[]> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return [];
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const inboxes = await db.inbox.findMany({
    where: {
      tenantId: actor.tenantId,
      isActive: true,
      ...(accessibleInboxIds ? { id: { in: accessibleInboxIds } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return inboxes.map((inbox: (typeof inboxes)[number]) => ({
    id: inbox.id,
    name: inbox.name,
  }));
}

export async function getAllTenantInboxOptions(actorUserId?: string): Promise<InboxOption[]> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return [];
  }

  const inboxes = await db.inbox.findMany({
    where: {
      tenantId: actor.tenantId,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return inboxes.map((inbox: (typeof inboxes)[number]) => ({
    id: inbox.id,
    name: inbox.name,
  }));
}

function normalizeOptionalField(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSlaValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function formatInboxSla(firstResponseSlaMinutes: number | null | undefined, resolutionSlaHours: number | null | undefined) {
  const parts = [
    firstResponseSlaMinutes ? `${firstResponseSlaMinutes} min primeira acao` : null,
    resolutionSlaHours ? `${resolutionSlaHours} h resolucao` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" / ") : "Sob monitoramento";
}

