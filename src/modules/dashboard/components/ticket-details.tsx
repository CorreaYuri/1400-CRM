import Link from "next/link";
import type { SelectedTicket, TimelineItem } from "@/modules/dashboard/types";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { UserAvatar } from "@/shared/components/user-avatar";

type TicketDetailsProps = {
  ticket: SelectedTicket | null;
  timeline: TimelineItem[];
};

export function TicketDetails({ ticket, timeline }: TicketDetailsProps) {
  if (!ticket) {
    return (
      <Panel tone="dark">
        <div className="grid gap-3 px-4 py-8 sm:px-5">
          <SectionHeader eyebrow="Chamado selecionado" title="Sem itens na fila" tone="dark" />
          <p className="max-w-2xl text-sm leading-6 text-zinc-300">
            Assim que houver chamados visiveis para esta sessao, o painel mostrara aqui os detalhes completos e a timeline operacional.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-3">
      <Panel tone="dark">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader eyebrow="Chamado selecionado" title={ticket.id} tone="dark" />
            <div className="flex flex-wrap items-center gap-2">
              {ticket.owner ? (
                <div className="flex items-center gap-2 rounded-[0.55rem] border border-zinc-100/50 px-3 py-1">
                  <UserAvatar name={ticket.owner.name} avatarUrl={ticket.owner.avatarUrl} size="sm" className="border-zinc-100" />
                  <span className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-zinc-300">
                    {ticket.owner.name}
                  </span>
                </div>
              ) : null}
              <span className="rounded-[0.55rem] border border-zinc-100/50 px-3 py-1 font-heading text-[0.62rem] uppercase tracking-[0.22em] text-zinc-300">
                {ticket.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:px-5">
          <div>
            <p className="font-heading text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
              Solicitante
            </p>
            <h4 className="mt-1.5 font-heading text-xl uppercase tracking-[-0.05em] sm:text-2xl">
              {ticket.customer}
            </h4>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {ticket.subject}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <DetailCell label="Inbox" value={ticket.inbox} />
            <OwnerCell owner={ticket.owner} />
            <DetailCell label="Origem" value={ticket.origin} />
            <DetailCell label="Abertura" value={ticket.createdAt} />
          </div>

          <section className="rounded-2xl border border-zinc-100/15 bg-zinc-950/40 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
                  Acoes rapidas
                </p>
                <p className="mt-1 text-sm leading-5 text-zinc-300">
                  Acesso direto ao fluxo principal do chamado sem espalhar opcoes pelo card.
                </p>
              </div>
              <Link href={`/tickets/${ticket.id}`} className="crm-btn-secondary text-[0.62rem]">
                Abrir completo
              </Link>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction href={`/tickets/${ticket.id}#acoes`} label="Assumir" />
              <QuickAction href={`/tickets/${ticket.id}#acoes`} label="Finalizar" />
              <QuickAction href={`/tickets/${ticket.id}#interacoes`} label="Comentar" />
              <QuickAction href={`/tickets/${ticket.id}#transferencia`} label="Transferir" />
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <InfoBox label="Proxima acao" value={ticket.nextAction} />
            <InfoBox label="Acordo atual" value={ticket.agreement} />
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-slate-950 px-4 py-4 sm:px-5">
          <SectionHeader eyebrow="Timeline do chamado" title="Observacoes e acordos" />
        </div>

        <div className="crm-scroll max-h-[58vh] overflow-y-auto divide-y divide-slate-950 px-4 sm:px-5">
          {timeline.map((item) => (
            <article
              key={`${item.time}-${item.title}-${item.author.name}`}
              className="grid gap-2 py-4 sm:grid-cols-[72px_1fr]"
            >
              <div>
                <span className="font-heading text-lg uppercase tracking-[-0.04em] text-zinc-500">
                  {item.time}
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <UserAvatar name={item.author.name} avatarUrl={item.author.avatarUrl} size="sm" />
                  <div>
                    <h4 className="font-heading text-base uppercase tracking-[-0.04em] text-slate-950">
                      {item.title}
                    </h4>
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">
                      {item.author.name}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100/15 bg-slate-950 px-3 py-3">
      <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}

function OwnerCell({ owner }: { owner: SelectedTicket["owner"] }) {
  return (
    <div className="rounded-2xl border border-zinc-100/15 bg-slate-950 px-3 py-3">
      <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
        Responsavel
      </p>
      {owner ? (
        <div className="mt-2 flex items-center gap-2">
          <UserAvatar name={owner.name} avatarUrl={owner.avatarUrl} size="sm" className="border-zinc-100" />
          <p className="text-sm text-zinc-200">{owner.name}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-zinc-200">Nao atribuido</p>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100/15 px-3 py-3">
      <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}


function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-[0.55rem] border border-zinc-100/18 bg-zinc-100/6 px-3 py-2 text-center font-heading text-[0.62rem] uppercase tracking-[0.22em] text-zinc-100 transition-colors hover:bg-zinc-100/12"
    >
      {label}
    </Link>
  );
}
