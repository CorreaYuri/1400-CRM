import "server-only";
import { NotificationJobStatus, TicketPriority, TicketStatus } from "@prisma/client";
import { logAuditEvent } from "@/modules/audit/server/audit-service";
import { env } from "@/server/env";
import { db } from "@/server/db";

type NotifyTicketMovementInput = {
  tenantId: string;
  ticketId: string;
  actorName: string;
  actorEmail?: string | null;
  title: string;
  summary: string;
  extraInboxIds?: string[];
};

type ProcessNotificationQueueResult = {
  claimed: number;
  sent: number;
  failed: number;
};

const JOB_EVENT = "TICKET_MOVEMENT";
const JOB_CHANNEL = "EMAIL";
const JOB_MAX_ATTEMPTS = 3;
const JOB_RETRY_DELAYS_MINUTES = [1, 5, 15] as const;

export async function notifyTicketMovement(input: NotifyTicketMovementInput) {
  if (!env.RESEND_API_KEY) {
    return;
  }

  await db.notificationJob.create({
    data: {
      tenantId: input.tenantId,
      ticketId: input.ticketId,
      channel: JOB_CHANNEL,
      event: JOB_EVENT,
      payload: serializePayload(input),
      maxAttempts: JOB_MAX_ATTEMPTS,
    },
  });

  await processEmailNotificationQueue({ limit: 1 });
}

export async function processEmailNotificationQueue(options?: { limit?: number }): Promise<ProcessNotificationQueueResult> {
  if (!env.RESEND_API_KEY) {
    return { claimed: 0, sent: 0, failed: 0 };
  }

  const limit = options?.limit && options.limit > 0 ? options.limit : 5;
  const now = new Date();
  const jobs = await db.notificationJob.findMany({
    where: {
      channel: JOB_CHANNEL,
      event: JOB_EVENT,
      status: {
        in: [NotificationJobStatus.PENDING, NotificationJobStatus.FAILED],
      },
      nextAttemptAt: {
        lte: now,
      },
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const result: ProcessNotificationQueueResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
  };

  for (const job of jobs) {
    const claimed = await db.notificationJob.updateMany({
      where: {
        id: job.id,
        status: {
          in: [NotificationJobStatus.PENDING, NotificationJobStatus.FAILED],
        },
      },
      data: {
        status: NotificationJobStatus.PROCESSING,
      },
    });

    if (claimed.count === 0) {
      continue;
    }

    result.claimed += 1;

    try {
      const payload = readNotifyPayload(job.payload);
      await sendTicketMovementNotification(payload);

      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: NotificationJobStatus.SENT,
          attempts: { increment: 1 },
          sentAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
        },
      });

      result.sent += 1;
    } catch (error) {
      const nextAttempts = job.attempts + 1;
      const isExhausted = nextAttempts >= job.maxAttempts;
      const errorMessage = error instanceof Error ? error.message : "Falha desconhecida ao enviar notificacao.";

      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: NotificationJobStatus.FAILED,
          attempts: nextAttempts,
          lastError: errorMessage.slice(0, 1000),
          nextAttemptAt: isExhausted ? null : buildNextAttemptAt(nextAttempts),
        },
      });

      if (isExhausted) {
        await logAuditEvent({
          tenantId: job.tenantId,
          entityType: "NOTIFICATION_JOB",
          entityId: job.id,
          action: "EMAIL_NOTIFICATION_GAVE_UP",
          payload: {
            ticketId: job.ticketId,
            event: job.event,
            attempts: nextAttempts,
            lastError: errorMessage,
          },
        });
      }

      console.error("Falha ao processar job de notificacao por e-mail.", {
        jobId: job.id,
        ticketId: job.ticketId,
        attempts: nextAttempts,
        error: errorMessage,
      });

      result.failed += 1;
    }
  }

  return result;
}

async function sendTicketMovementNotification(input: NotifyTicketMovementInput) {
  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      notificationSenderName: true,
      notificationSenderEmail: true,
    },
  });

  if (!tenant?.notificationSenderEmail) {
    throw new Error("Tenant sem remetente configurado para notificacoes.");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      id: input.ticketId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      number: true,
      subject: true,
      description: true,
      status: true,
      priority: true,
      updatedAt: true,
      inbox: {
        select: {
          id: true,
          name: true,
          memberships: {
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      assignedUser: {
        select: {
          name: true,
          email: true,
        },
      },
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error("Chamado nao encontrado para envio de notificacao.");
  }

  if (ticket.tenantId !== input.tenantId) {
    throw new Error("Contexto cruzado de tenant bloqueado na notificacao.");
  }

  const extraUsers = input.extraInboxIds?.length
    ? await db.user.findMany({
        where: {
          tenantId: input.tenantId,
          isActive: true,
          inboxMemberships: {
            some: {
              inboxId: {
                in: input.extraInboxIds,
              },
            },
          },
        },
        select: {
          name: true,
          email: true,
        },
      })
    : [];

  const actorEmail = input.actorEmail?.trim().toLowerCase() ?? null;
  const recipients = Array.from(
    new Map(
      [
        ticket.assignedUser,
        ticket.createdByUser,
        ...ticket.inbox.memberships.map((membership: (typeof ticket.inbox.memberships)[number]) => membership.user),
        ...extraUsers,
      ]
        .filter((user): user is { name: string; email: string } => Boolean(user?.email))
        .filter((user) => user.email.trim().toLowerCase() !== actorEmail)
        .map((user) => [user.email.trim().toLowerCase(), user]),
    ).values(),
  );

  if (recipients.length === 0) {
    return;
  }

  const ticketLabel = `CH-${ticket.number}`;
  const appUrl = env.APP_URL ?? "http://localhost:3000";
  const ticketUrl = `${appUrl}/tickets/${ticketLabel}`;
  const senderName = tenant.notificationSenderName?.trim() || tenant.name;
  const subject = `[${tenant.name}] ${input.title} - ${ticketLabel}`;
  const html = buildTicketNotificationHtml({
    tenantName: tenant.name,
    tenantLogoUrl: resolveTenantLogoUrl(tenant.logoUrl),
    senderName,
    ticketLabel,
    ticketUrl,
    title: input.title,
    summary: input.summary,
    actorName: input.actorName,
    customerName: ticket.customer?.name ?? "Solicitante sem nome",
    customerEmail: ticket.customer?.email ?? null,
    customerPhone: ticket.customer?.phone ?? null,
    subject: ticket.subject,
    description: ticket.description,
    inboxName: ticket.inbox.name,
    status: formatStatus(ticket.status),
    priority: formatPriority(ticket.priority),
    assigneeName: ticket.assignedUser?.name ?? "Nao atribuido",
    updatedAt: formatDateTime(ticket.updatedAt),
  });
  const text = buildTicketNotificationText({
    tenantName: tenant.name,
    ticketLabel,
    ticketUrl,
    title: input.title,
    summary: input.summary,
    actorName: input.actorName,
    subject: ticket.subject,
    inboxName: ticket.inbox.name,
    status: formatStatus(ticket.status),
    priority: formatPriority(ticket.priority),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${senderName} <${tenant.notificationSenderEmail}>`,
      to: recipients.map((user) => user.email),
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao enviar email de notificacao: ${errorText}`);
  }
}

function readNotifyPayload(value: unknown): NotifyTicketMovementInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Payload de notificacao invalido.");
  }

  const payload = value as Record<string, unknown>;
  const tenantId = typeof payload.tenantId === "string" ? payload.tenantId : "";
  const ticketId = typeof payload.ticketId === "string" ? payload.ticketId : "";
  const actorName = typeof payload.actorName === "string" ? payload.actorName : "";
  const actorEmail = typeof payload.actorEmail === "string" ? payload.actorEmail : null;
  const title = typeof payload.title === "string" ? payload.title : "";
  const summary = typeof payload.summary === "string" ? payload.summary : "";
  const extraInboxIds = Array.isArray(payload.extraInboxIds)
    ? payload.extraInboxIds.filter((item): item is string => typeof item === "string")
    : [];

  if (!tenantId || !ticketId || !actorName || !title || !summary) {
    throw new Error("Payload de notificacao incompleto.");
  }

  return {
    tenantId,
    ticketId,
    actorName,
    actorEmail,
    title,
    summary,
    extraInboxIds,
  };
}

function serializePayload(input: NotifyTicketMovementInput) {
  return JSON.parse(JSON.stringify(input));
}

function buildNextAttemptAt(attempts: number) {
  const delayMinutes = JOB_RETRY_DELAYS_MINUTES[Math.min(attempts - 1, JOB_RETRY_DELAYS_MINUTES.length - 1)] ?? 15;
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

function buildTicketNotificationHtml(input: {
  tenantName: string;
  tenantLogoUrl: string | null;
  senderName: string;
  ticketLabel: string;
  ticketUrl: string;
  title: string;
  summary: string;
  actorName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subject: string;
  description: string;
  inboxName: string;
  status: string;
  priority: string;
  assigneeName: string;
  updatedAt: string;
}) {
  const safeDescription = escapeHtml(input.description.length > 320 ? `${input.description.slice(0, 320)}...` : input.description);
  const customerLine = [input.customerName, input.customerEmail, input.customerPhone].filter(Boolean).join(" • ");

  return `
  <div style="margin:0;padding:32px;background:#e8eef5;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ec;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
      <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#f8fafc;">
        ${input.tenantLogoUrl ? `<img src="${escapeHtml(input.tenantLogoUrl)}" alt="${escapeHtml(input.tenantName)}" style="max-height:44px;max-width:180px;display:block;margin-bottom:18px;object-fit:contain;" />` : ""}
        <div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#94a3b8;">Central de chamados</div>
        <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;text-transform:uppercase;letter-spacing:-0.04em;">${escapeHtml(input.title)}</h1>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#cbd5e1;">${escapeHtml(input.summary)}</p>
      </div>

      <div style="padding:28px 32px;">
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
          ${buildBadge(input.ticketLabel, "#0f172a", "#f8fafc")}
          ${buildBadge(input.status, "#eef2ff", "#312e81")}
          ${buildBadge(input.priority, "#fff7ed", "#9a3412")}
          ${buildBadge(input.inboxName, "#f8fafc", "#334155")}
        </div>

        <div style="padding:18px 20px;border:1px solid #e2e8f0;background:#f8fafc;margin-bottom:20px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Resumo da movimentacao</div>
          <div style="font-size:16px;line-height:1.7;color:#0f172a;"><strong>${escapeHtml(input.actorName)}</strong> atualizou o chamado em ${escapeHtml(input.updatedAt)}.</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:20px;">
          ${buildInfoCard("Solicitante", escapeHtml(customerLine || "Nao informado"))}
          ${buildInfoCard("Responsavel", escapeHtml(input.assigneeName))}
          ${buildInfoCard("Assunto", escapeHtml(input.subject))}
          ${buildInfoCard("Atualizado em", escapeHtml(input.updatedAt))}
        </div>

        <div style="border:1px solid #e2e8f0;padding:18px 20px;margin-bottom:22px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Descricao atual</div>
          <div style="font-size:14px;line-height:1.8;color:#334155;">${safeDescription}</div>
        </div>

        <div style="text-align:center;">
          <a href="${escapeHtml(input.ticketUrl)}" style="display:inline-block;padding:14px 22px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
            Abrir chamado
          </a>
        </div>
      </div>

      <div style="padding:18px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;line-height:1.7;color:#64748b;">
        Disparo automatico enviado por ${escapeHtml(input.senderName)} para os usuarios envolvidos neste chamado.
      </div>
    </div>
  </div>`;
}

function buildTicketNotificationText(input: {
  tenantName: string;
  ticketLabel: string;
  ticketUrl: string;
  title: string;
  summary: string;
  actorName: string;
  subject: string;
  inboxName: string;
  status: string;
  priority: string;
}) {
  return [
    `${input.tenantName} - ${input.title}`,
    `${input.ticketLabel}`,
    "",
    input.summary,
    `Responsavel pela movimentacao: ${input.actorName}`,
    `Assunto: ${input.subject}`,
    `Inbox: ${input.inboxName}`,
    `Status: ${input.status}`,
    `Prioridade: ${input.priority}`,
    "",
    `Abrir chamado: ${input.ticketUrl}`,
  ].join("\n");
}

function buildBadge(label: string, background: string, color: string) {
  return `<span style="display:inline-block;padding:8px 12px;background:${background};color:${color};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;border:1px solid rgba(15,23,42,0.08);">${escapeHtml(label)}</span>`;
}

function buildInfoCard(label: string, value: string) {
  return `
    <div style="border:1px solid #e2e8f0;padding:14px 16px;background:#ffffff;">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">${label}</div>
      <div style="font-size:14px;line-height:1.7;color:#0f172a;">${value}</div>
    </div>`;
}

function formatStatus(status: TicketStatus) {
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

function formatPriority(priority: TicketPriority) {
  const labels: Record<TicketPriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[priority];
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveTenantLogoUrl(logoUrl: string | null) {
  if (!logoUrl) {
    return null;
  }

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  const appUrl = env.APP_URL ?? "http://localhost:3000";
  return new URL(logoUrl, appUrl).toString();
}




