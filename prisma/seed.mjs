import {
  InteractionType,
  PrismaClient,
  ScheduleStatus,
  TicketOrigin,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "1400demo";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-1400" },
    update: {},
    create: {
      name: "1400 Demo",
      slug: "demo-1400",
    },
  });

  const passwordHash = hashPassword(DEFAULT_PASSWORD);

  const [camila, rafael, gerente, admin] = await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "camila@1400.demo" } },
      update: {
        passwordHash,
        role: UserRole.AGENT,
      },
      create: {
        tenantId: tenant.id,
        name: "Camila Rocha",
        email: "camila@1400.demo",
        passwordHash,
        role: UserRole.AGENT,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "rafael@1400.demo" } },
      update: {
        passwordHash,
        role: UserRole.AGENT,
      },
      create: {
        tenantId: tenant.id,
        name: "Rafael Lima",
        email: "rafael@1400.demo",
        passwordHash,
        role: UserRole.AGENT,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "gerente@1400.demo" } },
      update: {
        passwordHash,
        role: UserRole.MANAGER,
      },
      create: {
        tenantId: tenant.id,
        name: "Gerente Demo",
        email: "gerente@1400.demo",
        passwordHash,
        role: UserRole.MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "admin@1400.demo" } },
      update: {
        passwordHash,
        role: UserRole.ADMIN,
      },
      create: {
        tenantId: tenant.id,
        name: "Admin Demo",
        email: "admin@1400.demo",
        passwordHash,
        role: UserRole.ADMIN,
      },
    }),
  ]);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "bianca@1400.demo" } },
    update: {
      passwordHash,
      role: UserRole.MANAGER,
    },
    create: {
      tenantId: tenant.id,
      name: "Bianca Cruz",
      email: "bianca@1400.demo",
      passwordHash,
      role: UserRole.MANAGER,
    },
  });

  const [financeiro, comercial, suporte, backoffice, triagemTecnica, dev, infra] = await Promise.all([
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "FIN" } },
      update: {
        description: "Tratativas financeiras e renegociacao com clientes.",
      },
      create: {
        tenantId: tenant.id,
        name: "Financeiro",
        code: "FIN",
        description: "Tratativas financeiras e renegociacao com clientes.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "COM" } },
      update: {
        description: "Demandas comerciais e validacoes de proposta.",
      },
      create: {
        tenantId: tenant.id,
        name: "Comercial",
        code: "COM",
        description: "Demandas comerciais e validacoes de proposta.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "SUP" } },
      update: {
        description: "Atendimento de suporte e operacao corrente.",
      },
      create: {
        tenantId: tenant.id,
        name: "Suporte",
        code: "SUP",
        description: "Atendimento de suporte e operacao corrente.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "BKO" } },
      update: {
        description: "Backoffice para tratativas internas, documentos e apoio operacional.",
      },
      create: {
        tenantId: tenant.id,
        name: "Backoffice",
        code: "BKO",
        description: "Backoffice para tratativas internas, documentos e apoio operacional.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "TRI" } },
      update: {
        description: "Etapa intermediaria para qualificar e filtrar demandas antes de migrar para Dev.",
      },
      create: {
        tenantId: tenant.id,
        name: "Triagem Tecnica",
        code: "TRI",
        description: "Etapa intermediaria para qualificar e filtrar demandas antes de migrar para Dev.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "DEV" } },
      update: {
        description: "Fila de desenvolvimento para demandas tecnicas aprovadas na triagem.",
      },
      create: {
        tenantId: tenant.id,
        name: "Dev",
        code: "DEV",
        description: "Fila de desenvolvimento para demandas tecnicas aprovadas na triagem.",
      },
    }),
    prisma.inbox.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "INF" } },
      update: {
        description: "Fila de infraestrutura para chamados internos, acessos e ambiente.",
      },
      create: {
        tenantId: tenant.id,
        name: "Infra",
        code: "INF",
        description: "Fila de infraestrutura para chamados internos, acessos e ambiente.",
      },
    }),
  ]);

  await Promise.all([
    upsertMembership(financeiro.id, camila.id),
    upsertMembership(backoffice.id, camila.id),
    upsertMembership(comercial.id, rafael.id),
    upsertMembership(dev.id, rafael.id),
    upsertMembership(suporte.id, gerente.id),
    upsertMembership(triagemTecnica.id, gerente.id),
    upsertMembership(infra.id, gerente.id),
    upsertMembership(financeiro.id, admin.id),
    upsertMembership(comercial.id, admin.id),
    upsertMembership(suporte.id, admin.id),
    upsertMembership(backoffice.id, admin.id),
    upsertMembership(triagemTecnica.id, admin.id),
    upsertMembership(dev.id, admin.id),
    upsertMembership(infra.id, admin.id),
  ]);

  const atlas = await prisma.customer.upsert({
    where: { id: "demo-customer-atlas" },
    update: {},
    create: {
      id: "demo-customer-atlas",
      tenantId: tenant.id,
      name: "Construtora Atlas",
      email: "contato@atlas.demo",
    },
  });

  const monte = await prisma.customer.upsert({
    where: { id: "demo-customer-monte" },
    update: {},
    create: {
      id: "demo-customer-monte",
      tenantId: tenant.id,
      name: "Grupo Monte",
      email: "relacionamento@monte.demo",
    },
  });

  const ticket2041 = await prisma.ticket.upsert({
    where: { tenantId_number: { tenantId: tenant.id, number: 2041 } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: atlas.id,
      inboxId: financeiro.id,
      createdByUserId: camila.id,
      assignedUserId: camila.id,
      number: 2041,
      subject: "Cliente pediu renegociacao do contrato em aberto",
      description: "Cliente quer revisar condicoes de pagamento e aguarda retorno.",
      status: TicketStatus.WAITING_RETURN,
      priority: TicketPriority.HIGH,
      origin: TicketOrigin.INTERNAL,
    },
  });

  const ticket2038 = await prisma.ticket.upsert({
    where: { tenantId_number: { tenantId: tenant.id, number: 2038 } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: monte.id,
      inboxId: comercial.id,
      createdByUserId: rafael.id,
      assignedUserId: rafael.id,
      number: 2038,
      subject: "Chamado filho aberto para validacao do setor comercial",
      description: "Necessita avaliacao comercial para confirmar condicoes.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      origin: TicketOrigin.INTERNAL,
    },
  });

  const ticket2045 = await prisma.ticket.upsert({
    where: { tenantId_number: { tenantId: tenant.id, number: 2045 } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: atlas.id,
      inboxId: triagemTecnica.id,
      createdByUserId: gerente.id,
      assignedUserId: gerente.id,
      number: 2045,
      subject: "Demanda precisa ser qualificada antes de seguir para desenvolvimento",
      description: "Triagem tecnica valida escopo, impacto e prioridade antes de encaminhar para Dev.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      origin: TicketOrigin.INTERNAL,
    },
  });

  const ticket2048 = await prisma.ticket.upsert({
    where: { tenantId_number: { tenantId: tenant.id, number: 2048 } },
    update: {},
    create: {
      tenantId: tenant.id,
      customerId: monte.id,
      inboxId: infra.id,
      createdByUserId: admin.id,
      assignedUserId: gerente.id,
      number: 2048,
      subject: "Liberar acesso interno ao ambiente e revisar permissoes de rede",
      description: "Chamado interno para Infra tratar acessos, VPN e validacao basica de ambiente.",
      status: TicketStatus.QUEUED,
      priority: TicketPriority.MEDIUM,
      origin: TicketOrigin.INTERNAL,
    },
  });

  await upsertInteraction(ticket2041.id, camila.id, InteractionType.INTERNAL_NOTE, "Chamado criado na inbox Financeiro apos contato do cliente.");
  await upsertInteraction(ticket2041.id, camila.id, InteractionType.AGREEMENT, "Cliente aceitou receber nova condicao de pagamento ainda hoje.");
  await upsertInteraction(ticket2038.id, rafael.id, InteractionType.STATUS_CHANGE, "Validacao comercial em andamento para fechamento da proposta.");
  await upsertInteraction(ticket2045.id, gerente.id, InteractionType.INTERNAL_NOTE, "Chamado recebido em Triagem Tecnica para filtrar e detalhar a demanda antes de migrar para Dev.");
  await upsertInteraction(ticket2048.id, admin.id, InteractionType.INTERNAL_NOTE, "Chamado interno direcionado para Infra para tratar liberacao de acesso e ambiente.");

  await prisma.ticketSchedule.upsert({
    where: { id: "demo-schedule-2041" },
    update: {},
    create: {
      id: "demo-schedule-2041",
      ticketId: ticket2041.id,
      scheduledById: camila.id,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 4),
      reason: "Retornar com contraproposta",
      status: ScheduleStatus.PENDING,
    },
  });
}

async function upsertMembership(inboxId, userId) {
  await prisma.inboxMembership.upsert({
    where: {
      inboxId_userId: {
        inboxId,
        userId,
      },
    },
    update: {},
    create: {
      inboxId,
      userId,
    },
  });
}

async function upsertInteraction(ticketId, authorId, type, content) {
  const existing = await prisma.ticketInteraction.findFirst({
    where: { ticketId, authorId, type, content },
  });

  if (!existing) {
    await prisma.ticketInteraction.create({
      data: { ticketId, authorId, type, content },
    });
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
