import { getDashboardData } from "@/modules/dashboard/data";
import { QueueList } from "@/modules/dashboard/components/queue-list";
import { TicketDetails } from "@/modules/dashboard/components/ticket-details";
import { Topbar } from "@/modules/dashboard/components/topbar";
import { StatCard } from "@/shared/components/stat-card";

type DashboardViewProps = {
  selectedTicketId?: string;
  actorUserId?: string;
};

export async function DashboardView({ selectedTicketId, actorUserId }: DashboardViewProps) {
  const dashboard = await getDashboardData(selectedTicketId, actorUserId);

  return (
    <div className="grid gap-2.5">
      <Topbar
        inboxName={dashboard.topbar.inboxName}
        queueCount={dashboard.topbar.queueCount}
        summary={dashboard.topbar.summary}
        alerts={dashboard.alerts}
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumo operacional">
        {dashboard.operationalHighlights.map((item) => (
          <div key={item.label} className="overflow-hidden border border-slate-950 bg-zinc-100">
            <StatCard {...item} />
          </div>
        ))}
      </section>

      <section className="grid gap-2.5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <QueueList tickets={dashboard.queueTickets} selectedTicketId={dashboard.selectedTicketId} />
        <TicketDetails ticket={dashboard.selectedTicket} timeline={dashboard.timeline} />
      </section>
    </div>
  );
}
