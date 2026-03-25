import "server-only";
import { TicketOrigin, TicketPriority, TicketStatus } from "@prisma/client";
import { db } from "@/server/db";

export type ReportFilters = {
  dateFrom: string;
  dateTo: string;
};

export type ReportSummary = {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  portalTickets: number;
  averageResolutionLabel: string;
};

export type SummaryComparisonItem = {
  current: number;
  previous: number;
  delta: number;
  deltaLabel: string;
  trend: "up" | "down" | "flat";
};

export type ReportComparison = {
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  totalTickets: SummaryComparisonItem;
  openTickets: SummaryComparisonItem;
  closedTickets: SummaryComparisonItem;
  portalTickets: SummaryComparisonItem;
};

export type InboxReportItem = {
  inboxId: string;
  inboxName: string;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  averageResolutionLabel: string;
};

export type AgentReportItem = {
  userId: string;
  name: string;
  role: string;
  assignedTickets: number;
  createdTickets: number;
  interactions: number;
  scheduledReturns: number;
};

export type ReportBreakdownItem = {
  label: string;
  totalTickets: number;
  shareLabel: string;
};

export type DailyVolumeItem = {
  date: string;
  totalTickets: number;
  portalTickets: number;
  closedTickets: number;
};

export type OperationalReportData = {
  filters: ReportFilters;
  summary: ReportSummary;
  comparison: ReportComparison;
  inboxes: InboxReportItem[];
  agents: AgentReportItem[];
  origins: ReportBreakdownItem[];
  priorities: ReportBreakdownItem[];
  dailyVolume: DailyVolumeItem[];
};

export type CsvExport = {
  filename: string;
  content: string;
};

const ACTIVE_TICKET_STATUSES = [
  TicketStatus.NEW,
  TicketStatus.QUEUED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_RETURN,
  TicketStatus.WAITING_OTHER_TEAM,
] as const;

export async function getOperationalReport(
  tenantId: string,
  rawFilters?: Partial<Record<string, string | string[] | undefined>>,
): Promise<OperationalReportData> {
  const filters = normalizeFilters(rawFilters);
  const range = buildCreatedAtRange(filters);
  const previousFilters = buildPreviousPeriodFilters(filters);
  const previousRange = buildCreatedAtRange(previousFilters);

  const [
    totalTickets,
    openTickets,
    closedTickets,
    portalTickets,
    closedResolutionSamples,
    previousTotalTickets,
    previousOpenTickets,
    previousClosedTickets,
    previousPortalTickets,
    inboxes,
    inboxTicketRows,
    users,
    assignedTicketRows,
    createdTicketRows,
    interactionRows,
    scheduleRows,
    distributionRows,
  ] = await Promise.all([
    db.ticket.count({
      where: {
        tenantId,
        createdAt: range,
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: range,
        status: {
          in: ACTIVE_TICKET_STATUSES,
        },
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: range,
        status: TicketStatus.CLOSED,
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: range,
        origin: TicketOrigin.CUSTOMER_PORTAL,
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
        status: TicketStatus.CLOSED,
        closedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        closedAt: true,
        inboxId: true,
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: previousRange,
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: previousRange,
        status: {
          in: ACTIVE_TICKET_STATUSES,
        },
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: previousRange,
        status: TicketStatus.CLOSED,
      },
    }),
    db.ticket.count({
      where: {
        tenantId,
        createdAt: previousRange,
        origin: TicketOrigin.CUSTOMER_PORTAL,
      },
    }),
    db.inbox.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
      },
      select: {
        inboxId: true,
        status: true,
      },
    }),
    db.user.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
        assignedUserId: {
          not: null,
        },
      },
      select: {
        assignedUserId: true,
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
      },
      select: {
        createdByUserId: true,
      },
    }),
    db.ticketInteraction.findMany({
      where: {
        createdAt: range,
        ticket: {
          tenantId,
        },
      },
      select: {
        authorId: true,
      },
    }),
    db.ticketSchedule.findMany({
      where: {
        createdAt: range,
        ticket: {
          tenantId,
        },
      },
      select: {
        scheduledById: true,
      },
    }),
    db.ticket.findMany({
      where: {
        tenantId,
        createdAt: range,
      },
      select: {
        createdAt: true,
        origin: true,
        priority: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const summary: ReportSummary = {
    totalTickets,
    openTickets,
    closedTickets,
    portalTickets,
    averageResolutionLabel: formatAverageResolution(closedResolutionSamples),
  };

  const comparison: ReportComparison = {
    currentPeriodLabel: `${filters.dateFrom} a ${filters.dateTo}`,
    previousPeriodLabel: `${previousFilters.dateFrom} a ${previousFilters.dateTo}`,
    totalTickets: buildComparisonItem(totalTickets, previousTotalTickets),
    openTickets: buildComparisonItem(openTickets, previousOpenTickets),
    closedTickets: buildComparisonItem(closedTickets, previousClosedTickets),
    portalTickets: buildComparisonItem(portalTickets, previousPortalTickets),
  };

  const inboxMap = new Map<string, { total: number; open: number; closed: number }>();
  for (const row of inboxTicketRows) {
    const current = inboxMap.get(row.inboxId) ?? { total: 0, open: 0, closed: 0 };
    current.total += 1;
    if (ACTIVE_TICKET_STATUSES.includes(row.status as (typeof ACTIVE_TICKET_STATUSES)[number])) {
      current.open += 1;
    }
    if (row.status === TicketStatus.CLOSED) {
      current.closed += 1;
    }
    inboxMap.set(row.inboxId, current);
  }

  const inboxResolutionMap = new Map<string, Array<{ createdAt: Date; closedAt: Date | null }>>();
  for (const sample of closedResolutionSamples) {
    const bucket = inboxResolutionMap.get(sample.inboxId) ?? [];
    bucket.push(sample);
    inboxResolutionMap.set(sample.inboxId, bucket);
  }

  const inboxesReport: InboxReportItem[] = inboxes.map((inbox: (typeof inboxes)[number]) => {
    const counts = inboxMap.get(inbox.id) ?? { total: 0, open: 0, closed: 0 };
    return {
      inboxId: inbox.id,
      inboxName: inbox.name,
      totalTickets: counts.total,
      openTickets: counts.open,
      closedTickets: counts.closed,
      averageResolutionLabel: formatAverageResolution(inboxResolutionMap.get(inbox.id) ?? []),
    };
  });

  const assignedCountMap = countByKey(
    assignedTicketRows.map((row: (typeof assignedTicketRows)[number]) => row.assignedUserId).filter(Boolean) as string[],
  );
  const createdCountMap = countByKey(createdTicketRows.map((row: (typeof createdTicketRows)[number]) => row.createdByUserId));
  const interactionCountMap = countByKey(interactionRows.map((row: (typeof interactionRows)[number]) => row.authorId));
  const scheduleCountMap = countByKey(scheduleRows.map((row: (typeof scheduleRows)[number]) => row.scheduledById));

  const agents: AgentReportItem[] = users
    .map((user: (typeof users)[number]) => ({
      userId: user.id,
      name: user.name,
      role: user.role,
      assignedTickets: assignedCountMap.get(user.id) ?? 0,
      createdTickets: createdCountMap.get(user.id) ?? 0,
      interactions: interactionCountMap.get(user.id) ?? 0,
      scheduledReturns: scheduleCountMap.get(user.id) ?? 0,
    }))
    .filter(
      (user: AgentReportItem) =>
        user.assignedTickets > 0 || user.createdTickets > 0 || user.interactions > 0 || user.scheduledReturns > 0,
    );

  const originCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  const dailyVolumeMap = new Map<string, DailyVolumeItem>();

  for (const row of distributionRows) {
    const originLabel = formatTicketOrigin(row.origin);
    originCounts.set(originLabel, (originCounts.get(originLabel) ?? 0) + 1);

    const priorityLabel = formatTicketPriority(row.priority);
    priorityCounts.set(priorityLabel, (priorityCounts.get(priorityLabel) ?? 0) + 1);

    const dateKey = row.createdAt.toISOString().slice(0, 10);
    const dailyItem = dailyVolumeMap.get(dateKey) ?? {
      date: dateKey,
      totalTickets: 0,
      portalTickets: 0,
      closedTickets: 0,
    };

    dailyItem.totalTickets += 1;
    if (row.origin === TicketOrigin.CUSTOMER_PORTAL) {
      dailyItem.portalTickets += 1;
    }
    if (row.status === TicketStatus.CLOSED) {
      dailyItem.closedTickets += 1;
    }
    dailyVolumeMap.set(dateKey, dailyItem);
  }

  const origins = mapBreakdown(originCounts, totalTickets);
  const priorities = mapBreakdown(priorityCounts, totalTickets, ["Urgente", "Alta", "Media", "Baixa"]);
  const dailyVolume = Array.from(dailyVolumeMap.values()).sort((left, right) => left.date.localeCompare(right.date, "pt-BR"));

  return {
    filters,
    summary,
    comparison,
    inboxes: inboxesReport,
    agents,
    origins,
    priorities,
    dailyVolume,
  };
}

export async function exportOperationalReportCsv(
  tenantId: string,
  rawFilters?: Partial<Record<string, string | string[] | undefined>>,
): Promise<CsvExport> {
  const report = await getOperationalReport(tenantId, rawFilters);
  const rows: string[][] = [];

  rows.push(["Relatorio operacional", `${report.filters.dateFrom} a ${report.filters.dateTo}`]);
  rows.push([]);
  rows.push(["Comparativo com periodo anterior"]);
  rows.push(["Indicador", "Atual", "Anterior", "Delta"]);
  rows.push([
    "Chamados",
    String(report.comparison.totalTickets.current),
    String(report.comparison.totalTickets.previous),
    report.comparison.totalTickets.deltaLabel,
  ]);
  rows.push([
    "Abertos",
    String(report.comparison.openTickets.current),
    String(report.comparison.openTickets.previous),
    report.comparison.openTickets.deltaLabel,
  ]);
  rows.push([
    "Fechados",
    String(report.comparison.closedTickets.current),
    String(report.comparison.closedTickets.previous),
    report.comparison.closedTickets.deltaLabel,
  ]);
  rows.push([
    "Portal",
    String(report.comparison.portalTickets.current),
    String(report.comparison.portalTickets.previous),
    report.comparison.portalTickets.deltaLabel,
  ]);
  rows.push([]);
  rows.push(["Resumo"]);
  rows.push(["Indicador", "Valor"]);
  rows.push(["Chamados", String(report.summary.totalTickets)]);
  rows.push(["Abertos", String(report.summary.openTickets)]);
  rows.push(["Fechados", String(report.summary.closedTickets)]);
  rows.push(["Portal", String(report.summary.portalTickets)]);
  rows.push(["Resolucao media", report.summary.averageResolutionLabel]);
  rows.push([]);
  rows.push(["Desempenho por inbox"]);
  rows.push(["Inbox", "Chamados", "Abertos", "Fechados", "Resolucao media"]);
  report.inboxes.forEach((item) => {
    rows.push([
      item.inboxName,
      String(item.totalTickets),
      String(item.openTickets),
      String(item.closedTickets),
      item.averageResolutionLabel,
    ]);
  });
  rows.push([]);
  rows.push(["Produtividade por atendente"]);
  rows.push(["Atendente", "Perfil", "Atribuidos", "Criados", "Interacoes", "Reagendamentos"]);
  report.agents.forEach((item) => {
    rows.push([
      item.name,
      item.role,
      String(item.assignedTickets),
      String(item.createdTickets),
      String(item.interactions),
      String(item.scheduledReturns),
    ]);
  });
  rows.push([]);
  rows.push(["Distribuicao por origem"]);
  rows.push(["Origem", "Chamados", "Participacao"]);
  report.origins.forEach((item) => {
    rows.push([item.label, String(item.totalTickets), item.shareLabel]);
  });
  rows.push([]);
  rows.push(["Distribuicao por prioridade"]);
  rows.push(["Prioridade", "Chamados", "Participacao"]);
  report.priorities.forEach((item) => {
    rows.push([item.label, String(item.totalTickets), item.shareLabel]);
  });
  rows.push([]);
  rows.push(["Volume diario"]);
  rows.push(["Data", "Chamados", "Portal", "Fechados"]);
  report.dailyVolume.forEach((item) => {
    rows.push([item.date, String(item.totalTickets), String(item.portalTickets), String(item.closedTickets)]);
  });

  return {
    filename: `relatorio-operacional-${report.filters.dateFrom}-${report.filters.dateTo}.csv`,
    content: rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n"),
  };
}

function normalizeFilters(rawFilters?: Partial<Record<string, string | string[] | undefined>>): ReportFilters {
  const now = new Date();
  const end = formatDateInput(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 29);

  return {
    dateFrom: normalizeDate(readSingle(rawFilters?.dateFrom)) ?? formatDateInput(start),
    dateTo: normalizeDate(readSingle(rawFilters?.dateTo)) ?? end,
  };
}

function buildCreatedAtRange(filters: ReportFilters) {
  const gte = new Date(`${filters.dateFrom}T00:00:00`);
  const lte = new Date(`${filters.dateTo}T23:59:59.999`);

  return {
    gte,
    lte,
  };
}

function buildPreviousPeriodFilters(filters: ReportFilters): ReportFilters {
  const start = new Date(`${filters.dateFrom}T00:00:00`);
  const end = new Date(`${filters.dateTo}T00:00:00`);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  return {
    dateFrom: formatDateInput(previousStart),
    dateTo: formatDateInput(previousEnd),
  };
}

function countByKey(keys: string[]) {
  const counts = new Map<string, number>();

  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function mapBreakdown(counts: Map<string, number>, totalTickets: number, preferredOrder?: string[]) {
  const items = Array.from(counts.entries()).map(([label, total]) => ({
    label,
    totalTickets: total,
    shareLabel: totalTickets > 0 ? `${((total / totalTickets) * 100).toFixed(1)}%` : "0%",
  }));

  if (!preferredOrder) {
    return items.sort((left, right) => right.totalTickets - left.totalTickets || left.label.localeCompare(right.label, "pt-BR"));
  }

  return items.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.label);
    const rightIndex = preferredOrder.indexOf(right.label);

    if (leftIndex === -1 && rightIndex === -1) {
      return right.totalTickets - left.totalTickets || left.label.localeCompare(right.label, "pt-BR");
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

function buildComparisonItem(current: number, previous: number): SummaryComparisonItem {
  const delta = current - previous;
  const prefix = delta > 0 ? "+" : "";
  const trend: SummaryComparisonItem["trend"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return {
    current,
    previous,
    delta,
    deltaLabel: `${prefix}${delta}`,
    trend,
  };
}

function formatAverageResolution(samples: Array<{ createdAt: Date; closedAt: Date | null }>) {
  const validSamples = samples.filter((sample) => sample.closedAt);

  if (validSamples.length === 0) {
    return "Sem base";
  }

  const totalHours = validSamples.reduce((total, sample) => {
    return total + (((sample.closedAt?.getTime() ?? sample.createdAt.getTime()) - sample.createdAt.getTime()) / (1000 * 60 * 60));
  }, 0);

  const averageHours = totalHours / validSamples.length;

  if (averageHours < 1) {
    return `${Math.max(1, Math.round(averageHours * 60))} min`;
  }

  return `${averageHours.toFixed(1)} h`;
}

function formatTicketOrigin(origin: TicketOrigin) {
  const labels: Record<TicketOrigin, string> = {
    INTERNAL: "Interno",
    CUSTOMER_PORTAL: "Portal",
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    API: "API",
  };

  return labels[origin];
}

function formatTicketPriority(priority: TicketPriority) {
  const labels: Record<TicketPriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[priority];
}

function escapeCsvValue(value: string) {
  const normalizedValue = value.replaceAll('"', '""');
  return /[";\r\n]/.test(normalizedValue) ? `"${normalizedValue}"` : normalizedValue;
}

function normalizeDate(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
