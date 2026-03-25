import type { AuditEventItem } from "@/modules/audit/server/audit-service";

type AuditTimelineProps = {
  events: AuditEventItem[];
};

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="border border-slate-950 bg-zinc-100 px-5 py-4 text-sm text-slate-700">
        Nenhum evento de auditoria encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="crm-scroll max-h-[68vh] overflow-y-auto grid gap-4">
      {events.map((event) => (
        <article key={event.id} className="border border-slate-950 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-heading text-sm uppercase tracking-[0.18em] text-slate-950">{event.action}</p>
              <p className="mt-1 text-sm text-slate-700">
                {event.entityType} <strong>{event.entityId}</strong>
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              {new Date(event.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            Autor: {event.actorName ?? "Sistema"}
            {event.actorEmail ? ` (${event.actorEmail})` : ""}
          </p>

          {event.payload ? (
            <pre className="mt-3 overflow-x-auto border border-slate-950 bg-zinc-100 px-4 py-3 text-xs leading-6 text-slate-700">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          ) : null}
        </article>
      ))}
    </div>
  );
}

