import Link from "next/link";
import type { DashboardAlert, SummaryItem } from "@/modules/dashboard/types";
import { Panel } from "@/shared/components/panel";

type TopbarProps = {
  inboxName: string;
  queueCount: string;
  summary: SummaryItem[];
  alerts: DashboardAlert[];
};

export function Topbar({ inboxName, queueCount, summary, alerts }: TopbarProps) {
  return (
    <Panel className="overflow-visible">
      <div className="relative z-10 border-b border-slate-900/10 px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-4xl">
            <p className="font-heading text-[0.58rem] uppercase tracking-[0.26em] text-slate-500">
              Inbox ativa
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="font-heading text-2xl uppercase tracking-[-0.07em] text-slate-950 sm:text-3xl">
                {inboxName}
              </h2>
              <span className="rounded-[0.58rem] border border-slate-200 bg-white/92 px-3 py-1 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-600 shadow-[0_8px_18px_rgba(148,163,184,0.14)]">
                {queueCount}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Painel operacional da inbox com leitura compacta da fila, dos atendimentos em andamento e dos retornos pendentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {alerts.length > 0 ? (
              <details className="group relative z-30">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[0.62rem] border border-amber-300/60 bg-amber-50 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-amber-950 shadow-[0_10px_22px_rgba(217,119,6,0.12)] transition-all hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(217,119,6,0.16)] marker:content-none group-open:border-amber-400 group-open:bg-white group-open:shadow-[0_18px_38px_rgba(217,119,6,0.2)]">
                  Notificacoes
                  <span className="rounded-[0.45rem] border border-amber-400/50 bg-white px-2 py-1 text-[0.58rem] text-amber-950">
                    {alerts.length.toString().padStart(2, "0")}
                  </span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(30rem,calc(100vw-3rem))] overflow-hidden rounded-[0.72rem] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_30px_70px_rgba(15,23,42,0.24)] ring-1 ring-white/70 backdrop-blur-sm">
                  <div className="border-b border-slate-900/8 px-4 py-3">
                    <p className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-500">
                      Alertas operacionais
                    </p>
                  </div>
                  <div className="crm-scroll max-h-[24rem] overflow-y-auto p-2.5">
                    <div className="grid gap-2.5">
                      {alerts.map((alert) => (
                        <Link
                          key={alert.title}
                          href={alert.href}
                          className="rounded-[0.62rem] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.86))] px-3 py-3.5 shadow-[0_10px_22px_rgba(148,163,184,0.12)] transition-all hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_14px_28px_rgba(148,163,184,0.16)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-heading text-[0.56rem] uppercase tracking-[0.2em] text-slate-500">Alerta</p>
                              <h3 className="mt-1 font-heading text-sm uppercase tracking-[-0.03em] text-slate-950">
                                {alert.title}
                              </h3>
                            </div>
                            <strong className="rounded-[0.5rem] border border-amber-300 bg-amber-50 px-2 py-1 font-heading text-[0.68rem] text-amber-950 shadow-[0_6px_16px_rgba(217,119,6,0.12)]">
                              {alert.value}
                            </strong>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{alert.detail}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ) : null}
            <Link href="/" className="crm-btn-secondary text-[0.62rem]">
              Voltar para hoje
            </Link>
            <Link href="/tickets" className="crm-btn-primary text-[0.62rem]">
              Ver fila completa
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.02))] px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4 lg:px-6">
        {summary.map((item) => (
          <div key={item.label} className="rounded-[0.72rem] border border-slate-900/8 bg-white/76 px-4 py-3.5 shadow-[0_12px_28px_rgba(148,163,184,0.12)]">
            <p className="font-heading text-[0.56rem] uppercase tracking-[0.2em] text-slate-500">
              {item.label}
            </p>
            <strong className="mt-1.5 block font-heading text-2xl uppercase tracking-[-0.05em] text-slate-950">
              {item.value}
            </strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}
