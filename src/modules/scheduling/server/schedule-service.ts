import "server-only";
import type { ScheduleItem } from "@/modules/tickets/server/types";
import { db } from "@/server/db";
import { getAccessibleInboxIds, resolveAccessActor } from "@/server/auth/access";

export async function getSchedules(actorUserId?: string): Promise<ScheduleItem[]> {
  const actor = await resolveAccessActor(actorUserId);

  if (!actor) {
    return [];
  }

  const accessibleInboxIds = await getAccessibleInboxIds(actor);
  const schedules = await db.ticketSchedule.findMany({
    where: {
      status: "PENDING",
      ticket: {
        tenantId: actor.tenantId,
        ...(accessibleInboxIds ? { inboxId: { in: accessibleInboxIds } } : {}),
      },
    },
    orderBy: { dueAt: "asc" },
    select: {
      dueAt: true,
      reason: true,
      ticket: {
        select: {
          number: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      },
      scheduledBy: {
        select: {
          name: true,
        },
      },
    },
    take: 50,
  });

  return schedules.map((schedule: (typeof schedules)[number]) => ({
    ticket: `CH-${schedule.ticket.number}`,
    customer: schedule.ticket.customer?.name ?? "Solicitante sem nome",
    due: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(schedule.dueAt),
    owner: schedule.scheduledBy.name,
    action: schedule.reason,
  }));
}
