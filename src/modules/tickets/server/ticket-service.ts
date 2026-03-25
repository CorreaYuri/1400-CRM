import "server-only";
import { InteractionType, Prisma, ScheduleStatus, TicketOrigin, TicketPriority, TicketRelationType, TicketStatus } from "@prisma/client";
import {
  addTicketInteractionSchema,
  assignTicketSchema,
  closeTicketSchema,
  createChildTicketSchema,
  createTicketSchema,
  publicCreateTicketSchema,
  scheduleTicketSchema,
  transferTicketSchema,
  type AddTicketInteractionInput,
  type AssignTicketInput,
  type CloseTicketInput,
  type CreateChildTicketInput,
  type CreateTicketInput,
  type PublicCreateTicketInput,
  type ScheduleTicketInput,
  type TransferTicketInput,
} from "@/modules/tickets/schemas";
import type {
  ListPagination,
  TicketAssigneeOption,
  TicketDetail,
  TicketListFilterOptions,
  TicketListFilters,
  TicketListItem,
} from "@/modules/tickets/server/types";
import { buildTicketSearchWhere, normalizeTicketSearchTerm } from "@/modules/tickets/server/ticket-search";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { notifyTicketMovement } from "@/modules/tickets/server/ticket-email-notifications";
import { removeTicketAttachmentFile, saveTicketAttachments, type SavedTicketAttachment } from "@/modules/tickets/server/attachment-storage";
import { canOperateInbox, canRouteAcrossTenant, getAccessibleInboxIds, hasTenantWideAccess, resolveAccessActor } from "@/server/auth/access";
import { db } from "@/server/db";

type TicketTransactionClient = Prisma.TransactionClient & {
  ticket: typeof db.ticket;
  customer: typeof db.customer;
  ticketRelation: typeof db.ticketRelation;
  ticketInteraction: typeof db.ticketInteraction;
  ticketAttachment: typeof db.ticketAttachment;
  $queryRaw: typeof db.$queryRaw;
  $executeRaw: typeof db.$executeRaw;
};

const LIST_PAGE_SIZE = 25;

export async function getTickets(
  rawFilters?: Partial<Record<string, string | string[] | undefined>>,
  actorUserId?: string,
) {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return {
      items: [],
      filters: { search: "", inbox: "", priority: "", owner: "", status: "" },
      filterOptions: { inboxes: [], priorities: [], owners: [], statuses: [] },
      pagination: buildListPagination(1, 0),
    };
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const rawSearch = normalizeTicketSearchTerm(readString(rawFilters?.search));
  const page = normalizePage(rawFilters?.page);
  const activeStatuses = [
    TicketStatus.NEW,
    TicketStatus.QUEUED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_RETURN,
    TicketStatus.WAITING_OTHER_TEAM,
  ];

  const baseWhere: Prisma.TicketWhereInput = {
    tenantId: actor.tenantId,
    ...(accessibleInboxIds ? { inboxId: { in: accessibleInboxIds } } : {}),
    ...(!rawSearch ? { status: { in: activeStatuses } } : {}),
    ...buildTicketSearchWhere(rawSearch),
  };

  const filterOptionRows = await db.ticket.findMany({
    where: baseWhere,
    select: {
      priority: true,
      status: true,
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

  const filterOptions: TicketListFilterOptions = {
    inboxes: uniqueSorted(filterOptionRows.map((ticket: (typeof filterOptionRows)[number]) => ticket.inbox.name)),
    priorities: uniqueSorted(filterOptionRows.map((ticket: (typeof filterOptionRows)[number]) => formatTicketPriority(ticket.priority)), ["Urgente", "Alta", "Media", "Baixa"]),
    owners: uniqueSorted(filterOptionRows.map((ticket: (typeof filterOptionRows)[number]) => ticket.assignedUser?.name ?? "Nao atribuido")),
    statuses: uniqueSorted(filterOptionRows.map((ticket: (typeof filterOptionRows)[number]) => formatTicketStatus(ticket.status)), ["Em atendimento", "Aguardando retorno", "Aguardando outro setor", "Na fila", "Novo"]),
  };

  const filters = normalizeTicketFilters(rawFilters, filterOptions);

  const filteredWhere: Prisma.TicketWhereInput = {
    ...baseWhere,
    ...(filters.inbox ? { inbox: { name: filters.inbox } } : {}),
    ...(filters.priority ? { priority: parseTicketPriorityLabel(filters.priority) } : {}),
    ...(filters.owner
      ? filters.owner === "Nao atribuido"
        ? { assignedUserId: null }
        : { assignedUser: { name: filters.owner } }
      : {}),
    ...(filters.status ? { status: parseTicketStatusLabel(filters.status) } : {}),
  };

  const totalItems = await db.ticket.count({ where: filteredWhere });
  const pagination = buildListPagination(page, totalItems);

  const tickets = await db.ticket.findMany({
    where: filteredWhere,
    orderBy: { number: "desc" },
    select: {
      number: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      assignedUserId: true,
      customer: {
        select: {
          name: true,
        },
      },
      inbox: {
        select: {
          name: true,
          firstResponseSlaMinutes: true,
          resolutionSlaHours: true,
        },
      },
      assignedUser: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
      schedules: {
        where: { status: "PENDING" },
        orderBy: { dueAt: "asc" },
        take: 1,
        select: {
          dueAt: true,
        },
      },
    },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });

  const items: TicketListItem[] = tickets.map((ticket: (typeof tickets)[number]) => {
    const risk = getTicketOperationalRisk(ticket);

    return {
      id: `CH-${ticket.number}`,
      customer: ticket.customer?.name ?? "Solicitante sem nome",
      subject: ticket.subject,
      inbox: ticket.inbox.name,
      status: formatTicketStatus(ticket.status),
      owner: ticket.assignedUser?.name ?? "Nao atribuido",
      ownerAvatarUrl: ticket.assignedUser?.avatarUrl ?? null,
      priority: formatTicketPriority(ticket.priority),
      schedule: ticket.schedules[0] ? formatDueAt(ticket.schedules[0].dueAt) : "Sem reagendamento",
      riskLabel: risk?.label ?? null,
      riskTone: risk?.tone ?? null,
    };
  });

  return {
    items,
    filters,
    filterOptions,
    pagination,
  };
}
export async function getTicketById(
  id: string,
  actorUserId?: string,
  options?: { timelinePage?: number; timelinePageSize?: number },
): Promise<TicketDetail | null> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return null;
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return null;
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
    include: {
      customer: true,
      inbox: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      schedules: {
        where: { status: "PENDING" },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
      parentRelations: {
        where: { type: TicketRelationType.CHILD },
        include: {
          childTicket: {
            include: {
              inbox: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      childRelations: {
        where: { type: TicketRelationType.CHILD },
        include: {
          parentTicket: {
            select: {
              number: true,
              inboxId: true,
            },
          },
        },
        take: 1,
      },
      createdByUser: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!ticket) {
    return null;
  }

  const canDirectOperate = await canOperateInbox(actor, ticket.inboxId);
  const parentInboxId = ticket.childRelations[0]?.parentTicket.inboxId ?? null;
  const canViewViaParent = parentInboxId ? await canOperateInbox(actor, parentInboxId) : false;

  if (!canDirectOperate && !canViewViaParent) {
    return null;
  }

  const timelinePageSize = options?.timelinePageSize && options.timelinePageSize > 0 ? options.timelinePageSize : 12;
  const shouldPaginateTimeline = options?.timelinePage !== undefined || options?.timelinePageSize !== undefined;

  let agreement = "Nenhum acordo formalizado ate o momento.";
  let timelinePagination: ListPagination | null = null;
  let timeline: TicketDetail["timeline"] = [];

  if (shouldPaginateTimeline) {
    const requestedPage = options?.timelinePage && options.timelinePage > 0 ? options.timelinePage : 1;
    const [timelineCount, latestAgreement] = await Promise.all([
      db.ticketInteraction.count({
        where: {
          ticketId: ticket.id,
        },
      }),
      db.ticketInteraction.findFirst({
        where: {
          ticketId: ticket.id,
          type: "AGREEMENT",
        },
        orderBy: { createdAt: "desc" },
        select: {
          content: true,
        },
      }),
    ]);

    agreement = latestAgreement?.content ?? agreement;

    if (timelineCount > 0) {
      timelinePagination = buildListPagination(requestedPage, timelineCount, timelinePageSize);
      const interactions = await db.ticketInteraction.findMany({
        where: {
          ticketId: ticket.id,
        },
        orderBy: { createdAt: "desc" },
        skip: (timelinePagination.page - 1) * timelinePagination.pageSize,
        take: timelinePagination.pageSize,
        include: {
          author: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              originalName: true,
              fileUrl: true,
              contentType: true,
              sizeBytes: true,
            },
          },
        },
      });

      timeline = interactions.map((interaction: (typeof interactions)[number]) => ({
        time: formatTime(interaction.createdAt),
        title: formatInteractionType(interaction.type),
        description: interaction.content,
        author: {
          name: interaction.author?.name ?? "Usuario indisponivel",
          avatarUrl: interaction.author?.avatarUrl ?? null,
        },
        attachments: interaction.attachments.map((attachment: (typeof interaction.attachments)[number]) => mapTicketAttachment(attachment)),
        isAttachmentOnly: isAttachmentOnlyInteraction(interaction.content, interaction.attachments.length),
      }));
    } else {
      timeline = [
        {
          time: formatTime(ticket.createdAt),
          title: "Chamado criado",
          description: ticket.description,
          author: {
            name: ticket.createdByUser?.name ?? "Usuario indisponivel",
            avatarUrl: ticket.createdByUser?.avatarUrl ?? null,
          },
          attachments: [],
          isAttachmentOnly: false,
        },
      ];
    }
  } else {
    const interactions = await db.ticketInteraction.findMany({
      where: {
        ticketId: ticket.id,
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            originalName: true,
            fileUrl: true,
            contentType: true,
            sizeBytes: true,
          },
        },
      },
    });

    agreement =
      interactions.find((interaction: (typeof interactions)[number]) => interaction.type === "AGREEMENT")?.content ?? agreement;

    timeline =
      interactions.length > 0
        ? interactions.map((interaction: (typeof interactions)[number]) => ({
            time: formatTime(interaction.createdAt),
            title: formatInteractionType(interaction.type),
            description: interaction.content,
            author: {
              name: interaction.author?.name ?? "Usuario indisponivel",
              avatarUrl: interaction.author?.avatarUrl ?? null,
            },
            attachments: interaction.attachments.map((attachment: (typeof interaction.attachments)[number]) => mapTicketAttachment(attachment)),
            isAttachmentOnly: isAttachmentOnlyInteraction(interaction.content, interaction.attachments.length),
          }))
        : [
            {
              time: formatTime(ticket.createdAt),
              title: "Chamado criado",
              description: ticket.description,
              author: {
                name: ticket.createdByUser?.name ?? "Usuario indisponivel",
                avatarUrl: ticket.createdByUser?.avatarUrl ?? null,
              },
              attachments: [],
              isAttachmentOnly: false,
            },
          ];
  }

  return {
    id: `CH-${ticket.number}`,
    customer: ticket.customer?.name ?? "Solicitante sem nome",
    subject: ticket.subject,
    description: ticket.description,
    inbox: ticket.inbox.name,
    inboxId: ticket.inboxId,
    status: formatTicketStatus(ticket.status),
    owner: ticket.assignedUser
      ? {
          id: ticket.assignedUser.id,
          name: ticket.assignedUser.name,
          avatarUrl: ticket.assignedUser.avatarUrl,
        }
      : null,
    priority: formatTicketPriority(ticket.priority),
    origin: formatTicketOrigin(ticket.origin),
    createdAt: formatCreatedAt(ticket.createdAt),
    nextAction: ticket.schedules[0]
      ? `${formatDueAt(ticket.schedules[0].dueAt)} - ${ticket.schedules[0].reason}`
      : "Sem proxima acao agendada",
    agreement,
    parentTicketId: ticket.childRelations[0] ? `CH-${ticket.childRelations[0].parentTicket.number}` : null,
    childTickets: ticket.parentRelations.map((relation: (typeof ticket.parentRelations)[number]) => ({
      id: `CH-${relation.childTicket.number}`,
      inbox: relation.childTicket.inbox.name,
      status: formatTicketStatus(relation.childTicket.status),
      subject: relation.childTicket.subject,
    })),
    timeline,
    timelinePagination,
    canOperate: canDirectOperate,
  };
}
export async function getAssignableUsersForTicket(id: string, actorUserId?: string): Promise<TicketAssigneeOption[]> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return [];
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return [];
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
    select: {
      inboxId: true,
    },
  });

  if (!ticket) {
    return [];
  }

  if (!(await canOperateInbox(actor, ticket.inboxId))) {
    return [];
  }

  const users = await db.user.findMany({
    where: {
      tenantId: actor.tenantId,
      isActive: true,
      inboxMemberships: {
        some: {
          inboxId: ticket.inboxId,
        },
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  return users.map((user: (typeof users)[number]) => ({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
  }));
}

export async function createTicket(input: CreateTicketInput, actorUserId?: string, attachmentFiles: File[] = []) {
  const parsed = createTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const creator = await resolveAccessActor(actorUserId);

  if (!creator) {
    return forbiddenError("Sessao invalida para registrar o chamado.");
  }

  const inbox = await db.inbox.findFirst({
    where: {
      id: parsed.data.inboxId,
      tenantId: creator.tenantId,
      isActive: true,
    },
  });

  if (!inbox) {
    return notFoundError("Inbox nao encontrada.");
  }

  if (!(await canOperateInbox(creator, inbox.id))) {
    return forbiddenError("Voce nao pode abrir chamados para esta inbox.");
  }

  const tenantSettings = await db.tenant.findUnique({
    where: { id: creator.tenantId },
    select: {
      allowedTicketOrigins: true,
    },
  });

  const allowedOrigins = tenantSettings?.allowedTicketOrigins?.length
    ? tenantSettings.allowedTicketOrigins
    : [TicketOrigin.INTERNAL, TicketOrigin.CUSTOMER_PORTAL, TicketOrigin.EMAIL, TicketOrigin.WHATSAPP, TicketOrigin.API];

  if (!allowedOrigins.includes(parsed.data.origin)) {
    return invalidStateError("A origem selecionada nao esta habilitada para este tenant.");
  }

  let savedAttachments: SavedTicketAttachment[] = [];

  try {
    savedAttachments = await saveTicketAttachments(attachmentFiles);

    const ticket = await db.$transaction(async (tx) => {
      const transaction = tx as TicketTransactionClient;
      const customer = await findOrCreateCustomer(transaction, inbox.tenantId, parsed.data);
      const number = await createNextTicketNumber(transaction, inbox.tenantId);

      const createdTicket = await transaction.ticket.create({
        data: {
          tenantId: inbox.tenantId,
          customerId: customer.id,
          inboxId: inbox.id,
          createdByUserId: creator.id,
          number,
          subject: parsed.data.subject,
          description: parsed.data.description,
          priority: parsed.data.priority,
          origin: parsed.data.origin,
          status: TicketStatus.QUEUED,
        },
      });

      const initialInteraction = await transaction.ticketInteraction.create({
        data: {
          ticketId: createdTicket.id,
          authorId: creator.id,
          type: InteractionType.INTERNAL_NOTE,
          content: buildAttachmentAwareMessage("Chamado criado manualmente pela operacao.", savedAttachments.length),
        },
      });

      if (savedAttachments.length > 0) {
        await transaction.ticketAttachment.createMany({
          data: savedAttachments.map((attachment) => ({
            ticketId: createdTicket.id,
            interactionId: initialInteraction.id,
            originalName: attachment.originalName,
            fileUrl: attachment.fileUrl,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          })),
        });
      }

      return createdTicket;
    });

    await logAuditEvent({
      tenantId: creator.tenantId,
      userId: creator.id,
      entityType: "TICKET",
      entityId: ticket.id,
      action: "TICKET_CREATED",
      payload: {
        ticketNumber: ticket.number,
        inboxId: inbox.id,
        inboxName: inbox.name,
        priority: parsed.data.priority,
        origin: parsed.data.origin,
        status: TicketStatus.QUEUED,
        subject: parsed.data.subject,
        attachmentCount: savedAttachments.length,
      } satisfies Prisma.InputJsonObject,
    });

    return {
      ok: true as const,
      status: 201,
      data: {
        id: `CH-${ticket.number}`,
      },
    };
  } catch (error) {
    await cleanupSavedAttachments(savedAttachments);
    return invalidStateError(error instanceof Error ? error.message : "Nao foi possivel registrar os anexos do chamado.");
  }
}
export async function createPortalTicket(tenantSlug: string, input: PublicCreateTicketInput, attachmentFiles: File[] = []) {
  const parsed = publicCreateTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      defaultTicketPriority: true,
      allowedTicketOrigins: true,
    },
  });

  if (!tenant) {
    return notFoundError("Portal do tenant nao encontrado.");
  }

  const allowedOrigins = tenant.allowedTicketOrigins?.length
    ? tenant.allowedTicketOrigins
    : [TicketOrigin.INTERNAL, TicketOrigin.CUSTOMER_PORTAL, TicketOrigin.EMAIL, TicketOrigin.WHATSAPP, TicketOrigin.API];

  if (!allowedOrigins.includes(TicketOrigin.CUSTOMER_PORTAL)) {
    return forbiddenError("Este tenant nao esta aceitando abertura publica de chamados.");
  }

  const inbox = await db.inbox.findFirst({
    where: {
      id: parsed.data.inboxId,
      tenantId: tenant.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!inbox) {
    return notFoundError("Inbox nao encontrada para este portal.");
  }

  const creator = await resolvePortalCreator(tenant.id);

  if (!creator) {
    return invalidStateError("Este tenant ainda nao possui equipe ativa para receber novos chamados.");
  }

  let savedAttachments: SavedTicketAttachment[] = [];

  try {
    savedAttachments = await saveTicketAttachments(attachmentFiles);

    const ticket = await db.$transaction(async (tx) => {
      const transaction = tx as TicketTransactionClient;
      const customer = await findOrCreateCustomer(transaction, tenant.id, {
        ...parsed.data,
        priority: tenant.defaultTicketPriority,
        origin: TicketOrigin.CUSTOMER_PORTAL,
      });
      const number = await createNextTicketNumber(transaction, tenant.id);

      const createdTicket = await transaction.ticket.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          inboxId: inbox.id,
          createdByUserId: creator.id,
          number,
          subject: parsed.data.subject,
          description: parsed.data.description,
          priority: tenant.defaultTicketPriority,
          origin: TicketOrigin.CUSTOMER_PORTAL,
          status: TicketStatus.QUEUED,
        },
      });

      const initialInteraction = await transaction.ticketInteraction.create({
        data: {
          ticketId: createdTicket.id,
          authorId: creator.id,
          type: InteractionType.INTERNAL_NOTE,
          content: buildAttachmentAwareMessage("Chamado aberto pelo portal do solicitante.", savedAttachments.length),
        },
      });

      if (savedAttachments.length > 0) {
        await transaction.ticketAttachment.createMany({
          data: savedAttachments.map((attachment) => ({
            ticketId: createdTicket.id,
            interactionId: initialInteraction.id,
            originalName: attachment.originalName,
            fileUrl: attachment.fileUrl,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          })),
        });
      }

      return createdTicket;
    });

    await logAuditEvent({
      tenantId: tenant.id,
      entityType: "TICKET",
      entityId: ticket.id,
      action: "TICKET_CREATED_FROM_PORTAL",
      payload: {
        ticketNumber: ticket.number,
        inboxId: inbox.id,
        inboxName: inbox.name,
        priority: tenant.defaultTicketPriority,
        origin: TicketOrigin.CUSTOMER_PORTAL,
        status: TicketStatus.QUEUED,
        subject: parsed.data.subject,
        requesterName: parsed.data.customerName,
        requesterEmail: parsed.data.customerEmail || null,
        requesterPhone: parsed.data.customerPhone || null,
        tenantSlug: tenant.slug,
        attachmentCount: savedAttachments.length,
      } satisfies Prisma.InputJsonObject,
    });

    return {
      ok: true as const,
      status: 201,
      data: {
        id: `CH-${ticket.number}`,
        message: `Chamado CH-${ticket.number} criado com sucesso.`,
      },
    };
  } catch (error) {
    await cleanupSavedAttachments(savedAttachments);
    return invalidStateError(error instanceof Error ? error.message : "Nao foi possivel registrar os anexos do chamado.");
  }
}
export async function transferTicket(id: string, input: TransferTicketInput, actorUserId?: string) {
  const parsed = transferTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return notFoundError("Chamado invalido.");
  }

  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return forbiddenError("Sessao invalida para transferir o chamado.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
    include: {
      inbox: true,
    },
  });

  if (!ticket) {
    return notFoundError("Chamado nao encontrado.");
  }

  if (!canRouteAcrossTenant(actor)) {
    return forbiddenError("Apenas gerentes e administradores podem transferir chamados entre inboxes.");
  }

  if (!(await canOperateInbox(actor, ticket.inboxId))) {
    return forbiddenError("Voce nao pode mover chamados desta inbox.");
  }

  if (parsed.data.inboxId === ticket.inboxId) {
    return invalidStateError("Selecione uma inbox diferente para transferir o chamado.");
  }

  const targetInbox = await db.inbox.findFirst({
    where: {
      id: parsed.data.inboxId,
      tenantId: ticket.tenantId,
      isActive: true,
    },
  });

  if (!targetInbox) {
    return notFoundError("Inbox de destino nao encontrada.");
  }

  if (!(await canOperateInbox(actor, targetInbox.id))) {
    return forbiddenError("Voce nao pode transferir chamados para esta inbox.");
  }

  const previousInboxName = ticket.inbox.name;

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      inboxId: targetInbox.id,
      assignedUserId: null,
      status: TicketStatus.QUEUED,
    },
  });

  await db.ticketInteraction.create({
    data: {
      ticketId: ticket.id,
      authorId: actor.id,
      type: InteractionType.INBOX_MOVEMENT,
      content: `Chamado transferido de ${previousInboxName} para ${targetInbox.name}. Motivo: ${parsed.data.reason}`,
    },
  });

  await logAuditEvent({
    tenantId: actor.tenantId,
    userId: actor.id,
    entityType: "TICKET",
    entityId: ticket.id,
    action: "TICKET_TRANSFERRED",
    payload: {
      ticketNumber: ticket.number,
      previousInboxId: ticket.inboxId,
      previousInboxName,
      targetInboxId: targetInbox.id,
      targetInboxName: targetInbox.name,
      reason: parsed.data.reason,
    } satisfies Prisma.InputJsonObject,
  });


  await safelyNotifyTicketMovement({
    tenantId: actor.tenantId,
    ticketId: ticket.id,
    actorName: actor.name,
    actorEmail: actor.email,
    title: "Chamado transferido",
    summary: `${id} foi transferido de ${previousInboxName} para ${targetInbox.name}. Motivo: ${parsed.data.reason}`,
    extraInboxIds: [targetInbox.id],
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      id,
      message: `Chamado ${id} transferido para ${targetInbox.name}.`,
    },
  };
}

export async function createChildTicket(parentId: string, input: CreateChildTicketInput, actorUserId?: string) {
  const parsed = createChildTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const parentNumber = extractTicketNumber(parentId);

  if (parentNumber === null) {
    return notFoundError("Chamado pai invalido.");
  }

  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return forbiddenError("Sessao invalida para abrir o chamado filho.");
  }

  const parentTicket = await db.ticket.findFirst({
    where: {
      number: parentNumber,
      tenantId: actor.tenantId,
    },
    include: {
      inbox: true,
    },
  });

  if (!parentTicket) {
    return notFoundError("Chamado pai nao encontrado.");
  }


  if (!(await canOperateInbox(actor, parentTicket.inboxId))) {
    return forbiddenError("Voce nao pode abrir chamado filho a partir desta inbox.");
  }

  if (parsed.data.inboxId === parentTicket.inboxId) {
    return invalidStateError("Selecione uma inbox diferente para abrir o chamado filho.");
  }

  const targetInbox = await db.inbox.findFirst({
    where: {
      id: parsed.data.inboxId,
      tenantId: parentTicket.tenantId,
      isActive: true,
    },
  });

  if (!targetInbox) {
    return notFoundError("Inbox de destino nao encontrada.");
  }

  const childTicket = await db.$transaction(async (tx) => {
    const transaction = tx as TicketTransactionClient;
    const number = await createNextTicketNumber(transaction, parentTicket.tenantId);
    const createdChildTicket = await transaction.ticket.create({
      data: {
        tenantId: parentTicket.tenantId,
        customerId: parentTicket.customerId,
        inboxId: targetInbox.id,
        createdByUserId: actor.id,
        number,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: TicketStatus.QUEUED,
      },
    });

    await transaction.ticketRelation.create({
      data: {
        parentTicketId: parentTicket.id,
        childTicketId: createdChildTicket.id,
        type: TicketRelationType.CHILD,
      },
    });

    if (![TicketStatus.CLOSED, TicketStatus.CANCELED].includes(parentTicket.status)) {
      await transaction.ticket.update({
        where: { id: parentTicket.id },
        data: {
          status: TicketStatus.WAITING_OTHER_TEAM,
        },
      });
    }

    return createdChildTicket;
  });

  await db.ticketInteraction.createMany({
    data: [
      {
        ticketId: parentTicket.id,
        authorId: actor.id,
        type: InteractionType.CHILD_TICKET_CREATED,
        content: `Chamado filho CH-${childTicket.number} criado para a inbox ${targetInbox.name}.`,
      },
      {
        ticketId: childTicket.id,
        authorId: actor.id,
        type: InteractionType.CHILD_TICKET_CREATED,
        content: `Chamado filho criado a partir de ${parentId} para tratar demanda derivada do atendimento original.`,
      },
    ],
  });

  await logAuditEvent({
    tenantId: actor.tenantId,
    userId: actor.id,
    entityType: "TICKET",
    entityId: parentTicket.id,
    action: "TICKET_CHILD_CREATED",
    payload: {
      parentTicketNumber: parentTicket.number,
      childTicketNumber: childTicket.number,
      childTicketId: childTicket.id,
      targetInboxId: targetInbox.id,
      targetInboxName: targetInbox.name,
      subject: parsed.data.subject,
    } satisfies Prisma.InputJsonObject,
  });


  await safelyNotifyTicketMovement({
    tenantId: actor.tenantId,
    ticketId: parentTicket.id,
    actorName: actor.name,
    actorEmail: actor.email,
    title: "Chamado filho criado",
    summary: `Foi aberto o chamado filho CH-${childTicket.number} para ${targetInbox.name}.`,
    extraInboxIds: [targetInbox.id],
  });

  return {
    ok: true as const,
    status: 201,
    data: {
      id: `CH-${childTicket.number}`,
      message: `Chamado filho CH-${childTicket.number} criado para ${targetInbox.name}.`,
    },
  };
}

export async function addTicketInteraction(id: string, input: AddTicketInteractionInput, actorUserId?: string, attachmentFiles: File[] = []) {
  const normalizedInteractionInput = {
    ...input,
    content: normalizeInteractionContent(input.type, input.content, attachmentFiles.length),
  };

  const parsed = addTicketInteractionSchema.safeParse(normalizedInteractionInput);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return notFoundError("Chamado invalido.");
  }

  const author = await resolveAccessActor(actorUserId);

  if (!author) {
    return forbiddenError("Sessao invalida para registrar a interacao.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: author.tenantId,
    },
  });

  if (!ticket) {
    return notFoundError("Chamado nao encontrado.");
  }

  if (!(await canOperateInbox(author, ticket.inboxId))) {
    return forbiddenError("Voce nao pode registrar interacoes nesta inbox.");
  }

  let savedAttachments: SavedTicketAttachment[] = [];

  try {
    savedAttachments = await saveTicketAttachments(attachmentFiles);

    const interaction = await db.$transaction(async (tx) => {
      const transaction = tx as TicketTransactionClient;
      const createdInteraction = await transaction.ticketInteraction.create({
        data: {
          ticketId: ticket.id,
          authorId: author.id,
          type: parsed.data.type,
          content: parsed.data.content,
        },
      });

      if (savedAttachments.length > 0) {
        await transaction.ticketAttachment.createMany({
          data: savedAttachments.map((attachment) => ({
            ticketId: ticket.id,
            interactionId: createdInteraction.id,
            originalName: attachment.originalName,
            fileUrl: attachment.fileUrl,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          })),
        });
      }

      return createdInteraction;
    });

    await safelyNotifyTicketMovement({
      tenantId: author.tenantId,
      ticketId: ticket.id,
      actorName: author.name,
      actorEmail: author.email,
      title: formatInteractionType(parsed.data.type),
      summary: buildAttachmentAwareMessage(parsed.data.content, savedAttachments.length),
    });

    return {
      ok: true as const,
      status: 201,
      data: {
        id,
        message: "Interacao registrada com sucesso.",
        interactionId: interaction.id,
      },
    };
  } catch (error) {
    await cleanupSavedAttachments(savedAttachments);
    return invalidStateError(error instanceof Error ? error.message : "Nao foi possivel registrar os anexos da interacao.");
  }
}
export async function scheduleTicket(id: string, input: ScheduleTicketInput, actorUserId?: string) {
  const parsed = scheduleTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return notFoundError("Chamado invalido.");
  }

  const dueAt = new Date(parsed.data.dueAt);

  if (Number.isNaN(dueAt.getTime())) {
    return invalidStateError("Data de reagendamento invalida.");
  }

  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return forbiddenError("Sessao invalida para reagendar o chamado.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
    include: {
      schedules: {
        where: { status: ScheduleStatus.PENDING },
      },
    },
  });

  if (!ticket) {
    return notFoundError("Chamado nao encontrado.");
  }

  if (!(await canOperateInbox(actor, ticket.inboxId))) {
    return forbiddenError("Voce nao pode reagendar chamados desta inbox.");
  }

  if (ticket.schedules.length > 0) {
    await db.ticketSchedule.updateMany({
      where: {
        ticketId: ticket.id,
        status: ScheduleStatus.PENDING,
      },
      data: {
        status: ScheduleStatus.CANCELED,
      },
    });
  }

  await db.ticketSchedule.create({
    data: {
      ticketId: ticket.id,
      scheduledById: actor.id,
      dueAt,
      reason: parsed.data.reason,
      status: ScheduleStatus.PENDING,
    },
  });

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: TicketStatus.WAITING_RETURN,
    },
  });

  await db.ticketInteraction.create({
    data: {
      ticketId: ticket.id,
      authorId: actor.id,
      type: InteractionType.RESCHEDULED,
      content: `Reagendado para ${formatDueAt(dueAt)}. Motivo: ${parsed.data.reason}`,
    },
  });

  await logAuditEvent({
    tenantId: actor.tenantId,
    userId: actor.id,
    entityType: "TICKET",
    entityId: ticket.id,
    action: "TICKET_RESCHEDULED",
    payload: {
      ticketNumber: ticket.number,
      dueAt: dueAt.toISOString(),
      reason: parsed.data.reason,
    } satisfies Prisma.InputJsonObject,
  });


  await safelyNotifyTicketMovement({
    tenantId: actor.tenantId,
    ticketId: ticket.id,
    actorName: actor.name,
    actorEmail: actor.email,
    title: "Chamado reagendado",
    summary: `Retorno reagendado para ${formatDueAt(dueAt)}. Motivo: ${parsed.data.reason}`,
  });

  return {
    ok: true as const,
    status: 201,
    data: {
      id,
      message: `Chamado ${id} reagendado para ${formatDueAt(dueAt)}.`,
    },
  };
}

export async function assumeTicket(id: string, actorUserId?: string, input?: AssignTicketInput) {
  const parsed = assignTicketSchema.safeParse(input ?? {});

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return notFoundError("Chamado invalido.");
  }

  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return forbiddenError("Sessao invalida para assumir o chamado.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
    include: { inbox: true },
  });

  if (!ticket) {
    return notFoundError("Chamado nao encontrado.");
  }

  if (!(await canOperateInbox(actor, ticket.inboxId))) {
    return forbiddenError("Voce nao pode operar este chamado nesta inbox.");
  }

  const targetUserId = parsed.data.userId ?? actor.id;
  const user = await db.user.findFirst({
    where: {
      id: targetUserId,
      tenantId: actor.tenantId,
      isActive: true,
      inboxMemberships: {
        some: {
          inboxId: ticket.inboxId,
        },
      },
    },
  });

  if (!user) {
    return invalidStateError("Selecione um integrante ativo da mesma inbox para receber o chamado.");
  }

  const isSelfAssignment = user.id === actor.id;
  const isAlreadyAssignedToTarget = ticket.assignedUserId === user.id && ticket.status === TicketStatus.IN_PROGRESS;

  if (isAlreadyAssignedToTarget) {
    return invalidStateError(
      isSelfAssignment
        ? "Este chamado ja esta assumido por voce."
        : `Este chamado ja esta com ${user.name}.`,
    );
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      assignedUserId: user.id,
      status: TicketStatus.IN_PROGRESS,
    },
  });

  const interactionContent = isSelfAssignment
    ? `Chamado assumido por ${user.name}.`
    : `Chamado repassado por ${actor.name} para ${user.name}.`;

  await db.ticketInteraction.create({
    data: {
      ticketId: ticket.id,
      authorId: actor.id,
      type: InteractionType.STATUS_CHANGE,
      content: interactionContent,
    },
  });

  await logAuditEvent({
    tenantId: actor.tenantId,
    userId: actor.id,
    entityType: "TICKET",
    entityId: ticket.id,
    action: isSelfAssignment ? "TICKET_ASSUMED" : "TICKET_REASSIGNED",
    payload: {
      ticketNumber: ticket.number,
      assignedUserId: user.id,
      assignedUserName: user.name,
      inboxId: ticket.inboxId,
      inboxName: ticket.inbox.name,
      previousAssignedUserId: ticket.assignedUserId,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
    } satisfies Prisma.InputJsonObject,
  });


  await safelyNotifyTicketMovement({
    tenantId: actor.tenantId,
    ticketId: ticket.id,
    actorName: actor.name,
    actorEmail: actor.email,
    title: isSelfAssignment ? "Chamado assumido" : "Chamado repassado",
    summary: isSelfAssignment ? `${id} foi assumido por ${user.name}.` : `${id} foi repassado por ${actor.name} para ${user.name}.`,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      id,
      message: isSelfAssignment
        ? `Chamado ${id} assumido por ${user.name}.`
        : `Chamado ${id} repassado para ${user.name}.`,
    },
  };
}
export async function closeTicket(id: string, input: CloseTicketInput, actorUserId?: string) {
  const parsed = closeTicketSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: parsed.error.flatten(),
    };
  }

  const number = extractTicketNumber(id);

  if (number === null) {
    return notFoundError("Chamado invalido.");
  }

  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return forbiddenError("Sessao invalida para finalizar o chamado.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      number,
      tenantId: actor.tenantId,
    },
  });

  if (!ticket) {
    return notFoundError("Chamado nao encontrado.");
  }

  if (!(await canOperateInbox(actor, ticket.inboxId))) {
    return forbiddenError("Voce nao pode finalizar chamados desta inbox.");
  }

  if ([TicketStatus.CLOSED, TicketStatus.CANCELED].includes(ticket.status)) {
    return invalidStateError("Este chamado ja foi encerrado.");
  }

  if (ticket.status !== TicketStatus.IN_PROGRESS) {
    return invalidStateError("Assuma o chamado antes de finalizar.");
  }

  if (!hasTenantWideAccess(actor) && ticket.assignedUserId !== actor.id) {
    return forbiddenError("Somente o responsavel atual pode finalizar este chamado.");
  }

  const tenantSettings = await db.tenant.findUnique({
    where: { id: actor.tenantId },
    select: {
      closureReasons: true,
    },
  });
  const allowedClosureReasons = tenantSettings?.closureReasons?.length
    ? tenantSettings.closureReasons
    : ["Resolvido", "Solicitacao atendida", "Sem retorno do solicitante"];

  if (!allowedClosureReasons.includes(parsed.data.reason)) {
    return invalidStateError("Selecione um motivo de encerramento valido para este tenant.");
  }

  const resolutionSummary = parsed.data.resolutionSummary?.trim() || undefined;
  const closingInteractionContent = resolutionSummary
    ? `Chamado finalizado por ${actor.name}. Motivo: ${parsed.data.reason}. Resumo da solucao: ${resolutionSummary}`
    : `Chamado finalizado por ${actor.name}. Motivo: ${parsed.data.reason}.`;

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
      assignedUserId: ticket.assignedUserId ?? actor.id,
    },
  });

  await db.ticketInteraction.create({
    data: {
      ticketId: ticket.id,
      authorId: actor.id,
      type: InteractionType.STATUS_CHANGE,
      content: closingInteractionContent,
    },
  });

  await logAuditEvent({
    tenantId: actor.tenantId,
    userId: actor.id,
    entityType: "TICKET",
    entityId: ticket.id,
    action: "TICKET_CLOSED",
    payload: {
      ticketNumber: ticket.number,
      inboxId: ticket.inboxId,
      closedBy: actor.name,
      assignedUserId: ticket.assignedUserId ?? actor.id,
      closureReason: parsed.data.reason,
      resolutionSummary: resolutionSummary ?? null,
    } satisfies Prisma.InputJsonObject,
  });


  await safelyNotifyTicketMovement({
    tenantId: actor.tenantId,
    ticketId: ticket.id,
    actorName: actor.name,
    actorEmail: actor.email,
    title: "Chamado finalizado",
    summary: resolutionSummary ? `Motivo: ${parsed.data.reason}. Resumo: ${resolutionSummary}` : `Motivo: ${parsed.data.reason}.`,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      id,
      message: `Chamado ${id} finalizado com sucesso.`,
    },
  };
}

async function safelyNotifyTicketMovement(input: Parameters<typeof notifyTicketMovement>[0]) {
  try {
    await notifyTicketMovement(input);
  } catch (error) {
    console.error("Falha ao enviar notificacao por e-mail do chamado.", error);
  }
}

async function cleanupSavedAttachments(attachments: SavedTicketAttachment[]) {
  await Promise.all(attachments.map((attachment) => removeTicketAttachmentFile(attachment.fileUrl)));
}

function buildAttachmentAwareMessage(baseMessage: string, attachmentCount: number) {
  if (attachmentCount <= 0) {
    return baseMessage;
  }

  return `${baseMessage} ${attachmentCount} anexo(s) adicionado(s).`;
}

function normalizeInteractionContent(type: AddTicketInteractionInput["type"], content: string, attachmentCount: number) {
  const trimmedContent = content.trim();

  if (trimmedContent.length > 0 || attachmentCount <= 0) {
    return trimmedContent;
  }

  const fallbackByType: Record<AddTicketInteractionInput["type"], string> = {
    INTERNAL_NOTE: "Anexo adicionado ao chamado.",
    CUSTOMER_MESSAGE: "Anexo enviado pelo solicitante.",
    AGREEMENT: "Anexo vinculado ao acordo do chamado.",
  };

  return fallbackByType[type];
}

function mapTicketAttachment(attachment: {
  id: string;
  originalName: string;
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
}) {
  return {
    id: attachment.id,
    name: attachment.originalName,
    url: `/api/tickets/attachments/${attachment.id}`,
    contentType: attachment.contentType,
    sizeLabel: formatAttachmentSize(attachment.sizeBytes),
    downloadName: attachment.originalName,
  };
}

function isAttachmentOnlyInteraction(content: string, attachmentCount: number) {
  if (attachmentCount <= 0) {
    return false;
  }

  return [
    "Anexo adicionado ao chamado.",
    "Anexo enviado pelo solicitante.",
    "Anexo vinculado ao acordo do chamado.",
  ].includes(content.trim());
}

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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

function parseTicketPriorityLabel(priority: string): TicketPriority | undefined {
  const map: Record<string, TicketPriority> = {
    Baixa: TicketPriority.LOW,
    Media: TicketPriority.MEDIUM,
    Alta: TicketPriority.HIGH,
    Urgente: TicketPriority.URGENT,
  };

  return map[priority];
}

function parseTicketStatusLabel(status: string): TicketStatus | undefined {
  const map: Record<string, TicketStatus> = {
    Novo: TicketStatus.NEW,
    "Na fila": TicketStatus.QUEUED,
    "Em atendimento": TicketStatus.IN_PROGRESS,
    "Aguardando retorno": TicketStatus.WAITING_RETURN,
    "Aguardando outro setor": TicketStatus.WAITING_OTHER_TEAM,
    Fechado: TicketStatus.CLOSED,
    Cancelado: TicketStatus.CANCELED,
  };

  return map[status];
}

function normalizeTicketFilters(
  rawFilters: Partial<Record<string, string | string[] | undefined>> | undefined,
  options: TicketListFilterOptions,
): TicketListFilters {
  const search = normalizeTicketSearchTerm(readString(rawFilters?.search));
  const inbox = readString(rawFilters?.inbox);
  const priority = readString(rawFilters?.priority);
  const owner = readString(rawFilters?.owner);
  const status = readString(rawFilters?.status);

  return {
    search,
    inbox: options.inboxes.includes(inbox) ? inbox : "",
    priority: options.priorities.includes(priority) ? priority : "",
    owner: options.owners.includes(owner) ? owner : "",
    status: options.statuses.includes(status) ? status : "",
  };
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

function notFoundError(message: string) {
  return {
    ok: false as const,
    status: 404,
    error: message,
  };
}

function invalidStateError(message: string) {
  return {
    ok: false as const,
    status: 400,
    error: message,
  };
}

function forbiddenError(message: string) {
  return {
    ok: false as const,
    status: 403,
    error: message,
  };
}

function extractTicketNumber(id: string) {
  const match = id.match(/CH-(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function createNextTicketNumber(tx: TicketTransactionClient, tenantId: string) {
  const lockKey = `ticket-number:${tenantId}`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const latestTicket = await tx.ticket.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  return (latestTicket?.number ?? 2000) + 1;
}

async function resolvePortalCreator(tenantId: string) {
  const preferredRoles = ["ADMIN", "MANAGER", "AGENT"] as const;

  for (const role of preferredRoles) {
    const user = await db.user.findFirst({
      where: {
        tenantId,
        role,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (user) {
      return user;
    }
  }

  return null;
}

async function findOrCreateCustomer(tx: TicketTransactionClient, tenantId: string, input: CreateTicketInput) {
  const normalizedName = input.customerName.trim();
  const normalizedEmail = normalizeOptionalField(input.customerEmail)?.toLowerCase();
  const normalizedPhone = normalizePhone(input.customerPhone);

  const existingCustomer = await tx.customer.findFirst({
    where: {
      tenantId,
      OR: [
        ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: "insensitive" as const } }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        {
          name: {
            equals: normalizedName,
            mode: "insensitive" as const,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingCustomer) {
    return tx.customer.update({
      where: { id: existingCustomer.id },
      data: {
        email: existingCustomer.email ?? normalizedEmail,
        phone: existingCustomer.phone ?? normalizedPhone,
      },
    });
  }

  return tx.customer.create({
    data: {
      tenantId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
    },
  });
}

function normalizeOptionalField(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizePhone(value: string | undefined) {
  const normalized = normalizeOptionalField(value);

  if (!normalized) {
    return undefined;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits || undefined;
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

function formatTicketPriority(priority: TicketPriority) {
  const labels: Record<TicketPriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[priority];
}

function formatTicketOrigin(origin: string) {
  const labels: Record<string, string> = {
    INTERNAL: "Manual por atendente",
    CUSTOMER_PORTAL: "Portal do solicitante",
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    API: "API",
  };

  return labels[origin] ?? origin;
}

function formatInteractionType(type: string) {
  const labels: Record<string, string> = {
    INTERNAL_NOTE: "Observacao interna",
    CUSTOMER_MESSAGE: "Mensagem do solicitante",
    AGREEMENT: "Acordo registrado",
    STATUS_CHANGE: "Mudanca de status",
    INBOX_MOVEMENT: "Movimentacao de inbox",
    CHILD_TICKET_CREATED: "Chamado filho criado",
    RESCHEDULED: "Reagendamento",
  };

  return labels[type] ?? type;
}

function formatDueAt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTicketOperationalRisk(ticket: {
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  schedules: Array<{ dueAt: Date }>;
  inbox?: {
    firstResponseSlaMinutes: number | null;
    resolutionSlaHours: number | null;
  } | null;
}) {
  const now = Date.now();
  const firstSchedule = ticket.schedules[0] ?? null;

  if (firstSchedule && firstSchedule.dueAt.getTime() < now) {
    return { label: "Retorno vencido", tone: "critical" as const };
  }

  if (ticket.priority === TicketPriority.URGENT && !ticket.assignedUserId) {
    return { label: "Urgente sem dono", tone: "critical" as const };
  }

  const firstResponseSlaMs = (ticket.inbox?.firstResponseSlaMinutes ?? 120) * 60 * 1000;
  const resolutionSlaMs = (ticket.inbox?.resolutionSlaHours ?? 4) * 60 * 60 * 1000;

  if ((ticket.status === TicketStatus.NEW || ticket.status === TicketStatus.QUEUED) && ticket.createdAt.getTime() <= now - firstResponseSlaMs) {
    const hoursLabel = ticket.inbox?.firstResponseSlaMinutes ? `${ticket.inbox.firstResponseSlaMinutes}min` : "2h";
    return { label: `Fila +${hoursLabel}`, tone: "warning" as const };
  }

  if (ticket.status === TicketStatus.IN_PROGRESS && ticket.updatedAt.getTime() <= now - resolutionSlaMs) {
    return { label: "Atendimento parado", tone: "warning" as const };
  }

  return null;
}

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


























































































