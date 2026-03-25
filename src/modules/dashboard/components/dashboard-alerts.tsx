import Link from "next/link";
import type { DashboardAlert } from "@/modules/dashboard/types";

type DashboardAlertsProps = {
  alerts: DashboardAlert[];
};

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className={`grid gap-3 ${alerts.length > 1 ? "xl:grid-cols-2" : ""}`} aria-label="Alertas operacionais">
      {alerts.map((alert) => (
        <article key={alert.title} className={`overflow-hidden rounded-[0.78rem] border border-slate-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.8))] px-4 py-4 shadow-[0_16px_36px_rgba(148,163,184,0.14)] sm:px-5 ${alerts.length === 1 ? "max-w-3xl" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-[0.56rem] uppercase tracking-[0.2em] text-slate-500">Alerta</p>
              <h3 className="mt-1 font-heading text-lg uppercase tracking-[-0.04em] text-slate-950">{alert.title}</h3>
            </div>
            <strong className="rounded-[0.58rem] border border-amber-300 bg-amber-50 px-2.5 py-1 font-heading text-sm text-amber-950 shadow-[0_8px_20px_rgba(217,119,6,0.12)]">{alert.value}</strong>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{alert.detail}</p>
          <Link href={alert.href} className="crm-btn-secondary mt-3 text-[0.6rem]">
            Ver agora
          </Link>
        </article>
      ))}
    </section>
  );
}
