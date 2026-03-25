import "server-only";
import { Prisma, TicketPriority, TicketStatus } from "@prisma/client";
import type {
  ListPagination,
  TodayQueueFilterOptions,
  TodayQueueFilters,
  TodayQueueItem,
} from "@/modules/tickets/server/types";
import { buildTicketSearchWhere, normalizeTicketSearchTerm } from "@/modules/tickets/server/ticket-search";
import { db } from "@/server/db";
import { getAccessibleInboxIds, resolveAccessActor } from "@/server/auth/access";

const LIST_PAGE_SIZE = 25;

export async function getTodayQueue(
  rawFilters?: Partial<Record<string, string | string[] | undefined>>,
  actorUserId?: string,
) {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return {
      items: [],
      filters: { search: "", source: "ALL", inbox: "", priority: "", owner: "" } as TodayQueueFilters,
      filterOptions: { inboxes: [], priorities: [], owners: [] } as TodayQueueFilterOptions,
      pagination: buildListPagination(1, 0),
    };
  }

  const { start, end } = getTodayBounds();
  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const search = normalizeTicketSearchTerm(readString(rawFilters?.search));
  const page = normalizePage(rawFilters?.page);

  const baseWhere: Prisma.TicketWhereInput = {
    tenantId: actor.tenantId,
    ...(accessibleInboxIds ? { inboxId: { in: accessibleInboxIds } } : {}),
    status: {
      in: [
        TicketStatus.NEW,
        TicketStatus.QUEUED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_RETURN,
        TicketStatus.WAITING_OTHER_TEAM,
      ],
    },
    OR: [
      {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      {
        schedules: {
          some: {
            status: "PENDING",
            dueAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    ],
    ...buildTicketSearchWhere(search),
  };

  const filterOptionRows = await db.ticket.findMany({
    where: baseWhere,
    select: {
      priority: true,
      inbox: {
        select: {
          name: true,
        },
      },
      assignedUser: {
        select: {
          name: true,
        },
      },
    },
  });

  const filterOptions: TodayQueueFilterOptions = {
    inboxes: uniqueSorted(filterOptionRows.map((item: (typeof filterOptionRows)[number]) => item.inbox.name)),
    priorities: uniqueSorted(filterOptionRows.map((item: (typeof filterOptionRows)[number]) => formatTicketPriority(item.priority)), ["Urgente", "Alta", "Media", "Baixa"]),
    owners: uniqueSorted(filterOptionRows.map((item: (typeof filterOptionRows)[number]) => item.assignedUser?.name ?? "Nao atribuido")),
  };

  const filters = normalizeFilters(rawFilters, filterOptions);

  const filteredWhere: Prisma.TicketWhereInput = {
    ...baseWhere,
    ...buildTodaySourceWhere(filters.source, start, end),
    ...(filters.inbox ? { inbox: { name: filters.inbox } } : {}),
    ...(filters.priority ? { priority: parseTicketPriorityLabel(filters.priority) } : {}),
    ...(filters.owner
      ? filters.owner === "Nao atribuido"
        ? { assignedUserId: null }
        : { assignedUser: { name: filters.owner } }
      : {}),
  };

  const totalItems = await db.ticket.count({ where: filteredWhere });
  const pagination = buildListPagination(page, totalItems);

  const tickets = await db.ticket.findMany({
    where: filteredWhere,
    select: {
      number: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      customer: {
        select: {
          name: true,
        },
      },
      inbox: {
        select: {
          name: true,
        },
      },
      assignedUser: {
        select: {
          name: true,
        },
      },
      schedules: {
        where: {
          status: "PENDING",
          dueAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: {
          dueAt: true,
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
      { number: "desc" },
    ],
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });

  const items: TodayQueueItem[] = tickets.map((ticket: (typeof tickets)[number]) => {
    const scheduledToday = ticket.schedules[0] ?? null;
    const sourceKey: TodayQueueItem["sourceKey"] = scheduledToday ? "SCHEDULED_TODAY" : "NEW_TODAY";

    return {
      id: `CH-${ticket.number}`,
      customer: ticket.customer?.name ?? "Solicitante sem nome",
      subject: ticket.subject,
      inbox: ticket.inbox.name,
      status: formatTicketStatus(ticket.status),
      owner: ticket.assignedUser?.name ?? "Nao atribuido",
      priority: formatTicketPriority(ticket.priority),
      source: scheduledToday ? "Retorno agendado" : "Novo hoje",
      sourceKey,
      dueLabel: scheduledToday
        ? `Retorno hoje as ${formatHour(scheduledToday.dueAt)}`
        : `Entrada hoje as ${formatHour(ticket.createdAt)}`,
      actionHint: scheduledToday
        ? "Tratar, finalizar ou reagendar."
        : "Assumir e iniciar atendimento.",
    };
  });

  return {
    items,
    filters,
    filterOptions,
    pagination,
  };
}

function normalizeFilters(
  rawFilters: Partial<Record<string, string | string[] | undefined>> | undefined,
  options: TodayQueueFilterOptions,
): TodayQueueFilters {
  const search = normalizeTicketSearchTerm(readString(rawFilters?.search));
  const source = readString(rawFilters?.source);
  const inbox = readString(rawFilters?.inbox);
  const priority = readString(rawFilters?.priority);
  const owner = readString(rawFilters?.owner);

  return {
    search,
    source: source === "NEW_TODAY" || source === "SCHEDULED_TODAY" ? source : "ALL",
    inbox: options.inboxes.includes(inbox) ? inbox : "",
    priority: options.priorities.includes(priority) ? priority : "",
    owner: options.owners.includes(owner) ? owner : "",
  };
}

function normalizePage(value: string | string[] | undefined) {
  const parsedValue = Number.parseInt(readString(value), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function buildListPagination(page: number, totalItems: number, pageSize = LIST_PAGE_SIZE): ListPagination {
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

function buildTodaySourceWhere(source: TodayQueueFilters["source"], start: Date, end: Date): Prisma.TicketWhereInput {
  if (source === "SCHEDULED_TODAY") {
    return {
      schedules: {
        some: {
          status: "PENDING",
          dueAt: {
            gte: start,
            lte: end,
          },
        },
      },
    };
  }

  if (source === "NEW_TODAY") {
    return {
      createdAt: {
        gte: start,
        lte: end,
      },
      schedules: {
        none: {
          status: "PENDING",
          dueAt: {
            gte: start,
            lte: end,
          },
        },
      },
    };
  }

  return {};
}

function parseTicketPriorityLabel(priority: string): TicketPriority | undefined {
  const map: Record<string, TicketPriority> = {
    Baixa: TicketPriority.LOW,
    Media: TicketPriority.MEDIUM,
    Alta: TicketPriority.HIGH,
    Urgente: TicketPriority.URGENT,
  };

  return map[priority];
}

function readString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function uniqueSorted(values: string[], preferredOrder?: string[]) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));

  if (!preferredOrder) {
    return uniqueValues.sort((left, right) => left.localeCompare(right, "pt-BR"));
  }

  return uniqueValues.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "pt-BR");
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatHour(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTicketStatus(status: TicketStatus) {
  const labels: Record<TicketStatus, string> = {
    NEW: "Novo",
    QUEUED: "Na fila",
    IN_PROGRESS: "Em atendimento",
    WAITING_RETURN: "Aguardando retorno",
    WAITING_OTHER_TEAM: "Aguardando outro setor",
    CLOSED: "Fechado",
    CANCELED: "Cancelado",
  };

  return labels[status];
}

function formatTicketPriority(priority: string) {
  const labels: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[priority] ?? priority;
}

