import "server-only";
import type { Prisma } from "@prisma/client";
import type { ListPagination } from "@/modules/tickets/server/types";
import { db } from "@/server/db";

export type AuditEventItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: Prisma.JsonValue;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditFilterState = {
  search: string;
  entityType: string;
  action: string;
  actorId: string;
  dateFrom: string;
  dateTo: string;
};

export type AuditFilterOptions = {
  entityTypes: string[];
  actions: string[];
  actors: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

export type SensitiveAuditSummary = {
  total: number;
  actions: string[];
  since: string;
};

type AuditPayload = Prisma.InputJsonValue;

const AUDIT_PAGE_SIZE = 40;

type LogAuditEventInput = {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  payload?: AuditPayload;
};

type AuditQueryFilters = {
  search?: string | string[];
  entityType?: string | string[];
  action?: string | string[];
  actorId?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
  page?: string | string[];
  limit?: number;
};

export async function logAuditEvent(input: LogAuditEventInput) {
  await db.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload,
    },
  });
}

export async function getAuditEvents(tenantId: string, rawFilters?: AuditQueryFilters) {
  const filters = normalizeAuditFilters(rawFilters);
  const where: Prisma.AuditEventWhereInput = {
    tenantId,
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { userId: filters.actorId } : {}),
    ...buildDateRangeWhere(filters.dateFrom, filters.dateTo),
    ...(filters.search
      ? {
          OR: [
            { entityId: { contains: filters.search, mode: "insensitive" } },
            { action: { contains: filters.search, mode: "insensitive" } },
            { entityType: { contains: filters.search, mode: "insensitive" } },
            { user: { is: { name: { contains: filters.search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: filters.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const page = normalizePage(rawFilters?.page);
  const pageSize = rawFilters?.limit && rawFilters.limit > 0 ? rawFilters.limit : AUDIT_PAGE_SIZE;
  const totalItems = await db.auditEvent.count({ where });
  const pagination = buildPagination(page, totalItems, pageSize);

  const events = await db.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    filters,
    pagination,
    items: events.map((event: (typeof events)[number]): AuditEventItem => ({
      id: event.id,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
      actorName: event.user?.name ?? null,
      actorEmail: event.user?.email ?? null,
    })),
  };
}

export async function getRecentSensitiveAuditSummary(tenantId: string, days = 3): Promise<SensitiveAuditSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sensitiveActions = [
    "USER_PASSWORD_RESET",
    "USER_SOFT_DELETED",
    "INBOX_ARCHIVED",
    "TICKET_TRANSFERRED",
    "TICKET_CLOSED",
  ] as const;

  const events = await db.auditEvent.findMany({
    where: {
      tenantId,
      action: {
        in: [...sensitiveActions],
      },
      createdAt: {
        gte: since,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      action: true,
    },
  });

  return {
    total: events.length,
    actions: Array.from(new Set(events.map((event: (typeof events)[number]) => event.action))),
    since: since.toISOString(),
  };
}

export async function getAuditFilterOptions(tenantId: string): Promise<AuditFilterOptions> {
  const [entityTypes, actions, actors] = await Promise.all([
    db.auditEvent.findMany({
      where: { tenantId },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
      select: { entityType: true },
    }),
    db.auditEvent.findMany({
      where: { tenantId },
      distinct: ["action"],
      orderBy: { action: "asc" },
      select: { action: true },
    }),
    db.user.findMany({
      where: {
        tenantId,
        auditEvents: {
          some: {},
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  return {
    entityTypes: entityTypes.map((item: (typeof entityTypes)[number]) => item.entityType),
    actions: actions.map((item: (typeof actions)[number]) => item.action),
    actors: actors.map((actor: (typeof actors)[number]) => ({
      id: actor.id,
      name: actor.name,
      email: actor.email,
    })),
  };
}

function normalizeAuditFilters(rawFilters?: AuditQueryFilters): AuditFilterState {
  return {
    search: readSingle(rawFilters?.search),
    entityType: readSingle(rawFilters?.entityType),
    action: readSingle(rawFilters?.action),
    actorId: readSingle(rawFilters?.actorId),
    dateFrom: readSingle(rawFilters?.dateFrom),
    dateTo: readSingle(rawFilters?.dateTo),
  };
}

function buildDateRangeWhere(dateFrom: string, dateTo: string) {
  const gte = parseDateStart(dateFrom);
  const lte = parseDateEnd(dateTo);

  if (!gte && !lte) {
    return {};
  }

  return {
    createdAt: {
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    },
  } satisfies Pick<Prisma.AuditEventWhereInput, "createdAt">;
}

function parseDateStart(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateEnd(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePage(value: string | string[] | undefined) {
  const parsedValue = Number.parseInt(readSingle(value), 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function buildPagination(page: number, totalItems: number, pageSize: number): ListPagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}
