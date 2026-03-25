import Link from "next/link";
import type { QueueTicket } from "@/modules/dashboard/types";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { UserAvatar } from "@/shared/components/user-avatar";

type QueueListProps = {
  tickets: QueueTicket[];
  selectedTicketId?: string | null;
};

export function QueueList({ tickets, selectedTicketId }: QueueListProps) {
  return (
    <Panel>
      <div className="border-b border-slate-950 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader eyebrow="Fila de chamados" title="Atendimento em andamento" />
          <div className="rounded-[0.55rem] border border-slate-300 bg-white/76 px-3 py-1 text-[0.62rem] uppercase tracking-[0.22em] text-zinc-500">
            {tickets.length === 1 ? "1 chamado visivel" : `${tickets.length} chamados visiveis`}
          </div>
        </div>
      </div>

      <div className="crm-scroll max-h-[64vh] overflow-y-auto divide-y divide-slate-950">
        {tickets.length === 0 ? (
          <div className="bg-zinc-100 px-4 py-6 text-sm leading-6 text-slate-700 sm:px-5">
            Nenhum chamado encontrado para as inboxes acessiveis nesta sessao.
          </div>
        ) : null}

        {tickets.map((ticket) => {
          const isSelected = ticket.id === selectedTicketId;
          const hasOwner = ticket.owner !== "Nao atribuido";

          return (
            <Link
              key={ticket.id}
              href={`/dashboard?ticket=${encodeURIComponent(ticket.id)}`}
              className={`block px-4 py-4 transition-colors sm:px-5 ${
                isSelected ? "bg-slate-950 text-zinc-100" : "bg-zinc-100 text-slate-950 hover:bg-zinc-200"
              }`}
            >
              <article>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-[0.72rem] uppercase tracking-[0.2em]">
                        {ticket.id}
                      </span>
                      <span
                        className={`rounded-[0.55rem] border px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] ${
                          isSelected ? "border-zinc-100 text-zinc-300" : "border-slate-950/30 text-zinc-600"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`rounded-[0.55rem] border px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] ${
                          isSelected ? "border-zinc-100 text-zinc-300" : "border-slate-950/30 text-zinc-600"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="mt-2 font-heading text-lg uppercase tracking-[-0.04em] sm:text-xl">
                      {ticket.customer}
                    </h4>
                    <p className={`mt-1 text-sm leading-6 ${isSelected ? "text-zinc-300" : "text-slate-700"}`}>
                      {ticket.subject}
                    </p>
                  </div>

                  <div className={`grid gap-1 text-right text-[0.62rem] uppercase tracking-[0.2em] ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                    <span>{ticket.inbox}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 border-t border-current/15 pt-3 sm:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] opacity-60">
                      Responsavel
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm">
                      {hasOwner ? (
                        <UserAvatar
                          name={ticket.owner}
                          avatarUrl={ticket.ownerAvatarUrl}
                          size="sm"
                          className={isSelected ? "border-zinc-100" : ""}
                        />
                      ) : null}
                      <p>{ticket.owner}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] opacity-60">
                      Proxima acao
                    </p>
                    <p className="mt-1.5 text-sm">{ticket.schedule}</p>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function riskBadgeClass(isSelected: boolean, tone: QueueTicket["riskTone"]) {
  if (tone === "critical") {
    return isSelected
      ? "rounded-[0.55rem] border border-rose-200 bg-rose-100 px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] text-rose-950"
      : "rounded-[0.55rem] border border-rose-300 bg-rose-50 px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] text-rose-900";
  }

  return isSelected
    ? "rounded-[0.55rem] border border-amber-200 bg-amber-100 px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] text-amber-950"
    : "rounded-[0.55rem] border border-amber-300 bg-amber-50 px-2.5 py-1 font-heading text-[0.6rem] uppercase tracking-[0.2em] text-amber-900";
}
