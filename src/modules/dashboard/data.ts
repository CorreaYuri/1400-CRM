import "server-only";
import { getTicketById, getTickets } from "@/modules/tickets/server/ticket-service";
import type { DashboardAlert, QueueTicket, SelectedTicket, StatItem, SummaryItem } from "@/modules/dashboard/types";
import { getAccessibleInboxIds, resolveAccessActor } from "@/server/auth/access";
import { db } from "@/server/db";

export async function getDashboardData(selectedTicketId?: string, actorUserId?: string) {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return {
      topbar: {
        inboxName: "Operacao geral",
        queueCount: "0 chamados visiveis",
        summary: [] as SummaryItem[],
      },
      operationalHighlights: [] as StatItem[],
      alerts: [] as DashboardAlert[],
      queueTickets: [] as QueueTicket[],
      selectedTicketId: null,
      selectedTicket: null,
      timeline: [],
    };
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const inboxScope = accessibleInboxIds ? { inboxId: { in: accessibleInboxIds } } : {};
  const tenantInboxWhere = {
    tenantId: actor.tenantId,
    isActive: true,
    ...(accessibleInboxIds ? { id: { in: accessibleInboxIds } } : {}),
  };

  const [
    { items },
    pendingScheduleCount,
    accessibleInboxCount,
    inboxesWithoutTeamCount,
    inboxesWithoutTeamSample,
    activeUsersWithoutInboxCount,
    activeUsersWithoutInboxSample,
  ] = await Promise.all([
    getTickets(undefined, actorUserId),
    db.ticketSchedule.count({
      where: {
        status: "PENDING",
        ticket: {
          tenantId: actor.tenantId,
          ...(accessibleInboxIds ? { inboxId: { in: accessibleInboxIds } } : {}),
        },
      },
    }),
    db.inbox.count({
      where: tenantInboxWhere,
    }),
    db.inbox.count({
      where: {
        ...tenantInboxWhere,
        memberships: {
          none: {},
        },
      },
    }),
    db.inbox.findMany({
      where: {
        ...tenantInboxWhere,
        memberships: {
          none: {},
        },
      },
      orderBy: { name: "asc" },
      take: 5,
      select: {
        name: true,
      },
    }),
    db.user.count({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        inboxMemberships: {
          none: {},
        },
      },
    }),
    db.user.findMany({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        inboxMemberships: {
          none: {},
        },
      },
      orderBy: { name: "asc" },
      take: 5,
      select: {
        name: true,
      },
    }),
  ]);

  const queueTickets: QueueTicket[] = items;
  const overdueSchedulesCount = queueTickets.filter((ticket) => ticket.riskLabel === "Retorno vencido").length;
  const urgentUnassignedCount = queueTickets.filter((ticket) => ticket.riskLabel === "Urgente sem dono").length;
  const agingQueueCount = queueTickets.filter((ticket) => ticket.riskLabel?.startsWith("Fila +")).length;
  const stalledInProgressCount = queueTickets.filter((ticket) => ticket.riskLabel === "Atendimento parado").length;
  const criticalTicketsCount = queueTickets.filter((ticket) => ticket.riskLabel !== null).length;

  const activeStatuses = new Set(["Na fila", "Em atendimento", "Aguardando retorno", "Aguardando outro setor", "Novo"]);
  const queuedCount = queueTickets.filter((ticket) => ticket.status === "Na fila").length;
  const inProgressCount = queueTickets.filter((ticket) => ticket.status === "Em atendimento").length;
  const waitingReturnCount = queueTickets.filter((ticket) => ticket.status === "Aguardando retorno").length;
  const activeCount = queueTickets.filter((ticket) => activeStatuses.has(ticket.status)).length;

  const selectedTicketRef = queueTickets.find((ticket) => ticket.id === selectedTicketId) ?? queueTickets[0] ?? null;
  const selectedTicketDetail = selectedTicketRef ? await getTicketById(selectedTicketRef.id, actorUserId) : null;

  const summary: SummaryItem[] = [
    { label: "Na fila", value: String(queuedCount) },
    { label: "Em atendimento", value: String(inProgressCount) },
    { label: "Retornos", value: String(waitingReturnCount) },
    { label: "SLA critico", value: String(criticalTicketsCount) },
  ];

  const operationalHighlights: StatItem[] = [
    {
      label: "Chamados ativos",
      value: String(activeCount),
      detail: "Itens visiveis nas inboxes acessiveis para a sessao atual.",
    },
    {
      label: "Agendamentos",
      value: String(pendingScheduleCount),
      detail: "Retornos pendentes ordenados por vencimento no tenant atual.",
    },
    {
      label: "SLA em risco",
      value: String(criticalTicketsCount),
      detail: "Chamados com retorno vencido, fila acima do SLA, urgencia sem dono ou atendimento parado.",
    },
    {
      label: "Inboxes acessiveis",
      value: String(accessibleInboxCount),
      detail: "Setores liberados para consulta conforme a permissao do usuario.",
    },
  ];

  const alerts: DashboardAlert[] = [];

  if (overdueSchedulesCount > 0) {
    alerts.push({
      title: "Retornos vencidos",
      value: String(overdueSchedulesCount),
      detail: "Chamados com reagendamento pendente e horario ja ultrapassado.",
      href: "/agendamentos",
    });
  }

  if (urgentUnassignedCount > 0) {
    alerts.push({
      title: "Urgentes sem dono",
      value: String(urgentUnassignedCount),
      detail: "Chamados urgentes ainda sem responsavel definido na fila ativa.",
      href: "/tickets?priority=Urgente",
    });
  }

  if (agingQueueCount > 0) {
    alerts.push({
      title: "Fila envelhecendo",
      value: String(agingQueueCount),
      detail: "Chamados novos ou na fila acima do SLA de primeira acao configurado na inbox.",
      href: "/tickets",
    });
  }

  if (stalledInProgressCount > 0) {
    alerts.push({
      title: "Atendimento parado",
      value: String(stalledInProgressCount),
      detail: "Chamados em atendimento acima do SLA de resolucao configurado na inbox.",
      href: "/tickets?status=Em%20atendimento",
    });
  }

  if (inboxesWithoutTeamCount > 0) {
    const inboxNames = inboxesWithoutTeamSample.map((inbox: (typeof inboxesWithoutTeamSample)[number]) => inbox.name).join(", ");
    alerts.push({
      title: "Inboxes sem equipe",
      value: String(inboxesWithoutTeamCount),
      detail: inboxNames
        ? `Filas sem membros vinculados: ${inboxNames}${inboxesWithoutTeamCount > inboxesWithoutTeamSample.length ? ", ..." : ""}.`
        : "Existem filas sem membros vinculados.",
      href: "/inboxes?teamCoverageFilter=WITHOUT_TEAM",
    });
  }

  if (activeUsersWithoutInboxCount > 0) {
    const userNames = activeUsersWithoutInboxSample.map((user: (typeof activeUsersWithoutInboxSample)[number]) => user.name).join(", ");
    alerts.push({
      title: "Usuarios sem inbox",
      value: String(activeUsersWithoutInboxCount),
      detail: userNames
        ? `Usuarios ativos sem cobertura operacional: ${userNames}${activeUsersWithoutInboxCount > activeUsersWithoutInboxSample.length ? ", ..." : ""}.`
        : "Existem usuarios ativos sem cobertura operacional.",
      href: "/usuarios?coverageFilter=WITHOUT_INBOX",
    });
  }

  return {
    topbar: {
      inboxName: selectedTicketDetail?.inbox ?? "Operacao geral",
      queueCount: queueTickets.length === 1 ? "1 chamado visivel" : `${queueTickets.length} chamados visiveis`,
      summary,
    },
    operationalHighlights,
    alerts,
    queueTickets,
    selectedTicketId: selectedTicketRef?.id ?? null,
    selectedTicket: selectedTicketDetail ? mapSelectedTicket(selectedTicketDetail) : null,
    timeline: selectedTicketDetail?.timeline ?? [],
  };
}

function mapSelectedTicket(ticket: Awaited<ReturnType<typeof getTicketById>> extends infer T ? Exclude<T, null> : never): SelectedTicket {
  return {
    id: ticket.id,
    customer: ticket.customer,
    subject: ticket.subject,
    inbox: ticket.inbox,
    status: ticket.status,
    origin: ticket.origin,
    owner: ticket.owner,
    createdAt: ticket.createdAt,
    nextAction: ticket.nextAction,
    agreement: ticket.agreement,
  };
}

