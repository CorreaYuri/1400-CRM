import Link from "next/link";
import type { ScheduleItem } from "@/modules/tickets/server/types";
import { AppShell } from "@/shared/components/app-shell";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { StatCard } from "@/shared/components/stat-card";

type ScheduleListViewProps = {
  schedules: ScheduleItem[];
};

const laneLabels = ["Todos", "Retornos", "Follow-up", "Prioritarios"] as const;

export function ScheduleListView({ schedules }: ScheduleListViewProps) {
  const uniqueCustomers = new Set(schedules.map((schedule) => schedule.customer)).size;
  const assignedCount = schedules.filter((schedule) => schedule.owner !== "Nao atribuido").length;
  const nextDue = schedules[0]?.due ?? "Sem retornos pendentes";

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Operacao" title="Agenda de retornos" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
            Visao central dos chamados reagendados, com proxima retomada, motivo do retorno e responsavel pela acao.
          </p>
        </div>

        <div className="grid gap-px border-b border-slate-950 bg-slate-950 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Agenda"
            value={String(schedules.length).padStart(2, "0")}
            detail="Quantidade total de retornos programados na fila atual."
          />
          <StatCard
            label="Contatos"
            value={String(uniqueCustomers).padStart(2, "0")}
            detail="Contatos impactados por retornos e follow-ups em aberto."
          />
          <StatCard
            label="Com dono"
            value={String(assignedCount).padStart(2, "0")}
            detail="Retornos ja vinculados a alguem para acompanhar a retomada."
          />
          <StatCard
            label="Proximo"
            value={nextDue}
            detail="Janela mais proxima prevista para retomar um atendimento pendente."
          />
        </div>

        <div className="border-b border-slate-950 px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {laneLabels.map((label, index) => (
                <span
                  key={label}
                  className={index === 0
                    ? "border border-slate-950 bg-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-100"
                    : "border border-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500"}
                >
                  {label}
                </span>
              ))}
            </div>

            <p className="text-sm leading-6 text-zinc-600">
              {schedules.length} retornos carregados para acompanhamento rapido.
            </p>
          </div>
        </div>

        <div className="crm-scroll max-h-[68vh] overflow-y-auto divide-y divide-slate-950">
          {schedules.length === 0 ? (
            <div className="px-5 py-10 text-sm leading-7 text-slate-700 sm:px-6 lg:px-8">
              Nenhum retorno pendente no momento.
            </div>
          ) : null}

          {schedules.map((schedule, index) => (
            <article
              key={`${schedule.ticket}-${schedule.due}-${index}`}
              className={index === 0 ? "bg-slate-950 px-5 py-5 text-zinc-100 sm:px-6 lg:px-8" : "bg-zinc-100 px-5 py-5 text-slate-950 sm:px-6 lg:px-8"}
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)_auto] xl:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={index === 0 ? "border border-zinc-100 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-300" : "border border-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-600"}>
                      {schedule.ticket}
                    </span>
                    <span className={index === 0 ? "border border-slate-700 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-300" : "border border-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-600"}>
                      {schedule.due}
                    </span>
                  </div>

                  <h2 className="mt-4 font-heading text-2xl uppercase tracking-[-0.05em]">
                    {schedule.customer}
                  </h2>
                  <p className={index === 0 ? "mt-3 max-w-3xl text-sm leading-7 text-zinc-300" : "mt-3 max-w-3xl text-sm leading-7 text-slate-700"}>
                    {schedule.action}
                  </p>
                </div>

                <div className={index === 0 ? "grid gap-px border border-slate-800 bg-slate-800 sm:grid-cols-2 xl:grid-cols-1" : "grid gap-px border border-slate-950 bg-slate-950 sm:grid-cols-2 xl:grid-cols-1"}>
                  <div className={index === 0 ? "bg-slate-950 px-4 py-4" : "bg-zinc-100 px-4 py-4"}>
                    <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                      Proxima retomada
                    </p>
                    <p className={index === 0 ? "mt-2 text-sm text-zinc-200" : "mt-2 text-sm text-slate-800"}>{schedule.due}</p>
                  </div>
                  <div className={index === 0 ? "bg-slate-950 px-4 py-4" : "bg-zinc-100 px-4 py-4"}>
                    <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                      Responsavel
                    </p>
                    <p className={index === 0 ? "mt-2 text-sm text-zinc-200" : "mt-2 text-sm text-slate-800"}>{schedule.owner}</p>
                  </div>
                </div>

                <div className="flex xl:justify-end">
                  <Link
                    href={`/tickets/${schedule.ticket}`}
                    className={index === 0 ? "inline-flex border border-zinc-100 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 transition-colors hover:bg-slate-900" : "inline-flex border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 transition-colors hover:bg-zinc-200"}
                  >
                    Abrir chamado
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}


