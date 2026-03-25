import { getOperationalReport } from "@/modules/reports/server/report-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { StatCard } from "@/shared/components/stat-card";
import { requirePageRole, requirePageSession } from "@/server/auth/session";

type RelatoriosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type MiniChartItem = {
  label: string;
  value: number;
  href: string;
  tooltip: string;
  isActive?: boolean;
  accentClass?: string;
};

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  await requirePageRole(["ADMIN", "MANAGER"]);
  const session = await requirePageSession();
  const rawFilters = (await searchParams) ?? {};
  const report = await getOperationalReport(session.user.tenantId, rawFilters);
  const dateFrom = readSingle(rawFilters.dateFrom) || report.filters.dateFrom;
  const dateTo = readSingle(rawFilters.dateTo) || report.filters.dateTo;
  const selectedOrigin = readSingle(rawFilters.origin);
  const selectedPriority = readSingle(rawFilters.priority);
  const selectedDay = readSingle(rawFilters.day);
  const csvHref = buildCsvHref(report.filters.dateFrom, report.filters.dateTo);

  const originChartItems = report.origins.slice(0, 4).map((item) => ({
    label: item.label,
    value: item.totalTickets,
    href: buildFilterHref({ dateFrom, dateTo, origin: item.label }, "origins-section"),
    tooltip: `${item.label}: ${item.totalTickets} chamados (${item.shareLabel})`,
    isActive: selectedOrigin === item.label,
  }));

  const priorityChartItems = report.priorities.map((item) => ({
    label: item.label,
    value: item.totalTickets,
    href: buildFilterHref({ dateFrom, dateTo, priority: item.label }, "priorities-section"),
    tooltip: `${item.label}: ${item.totalTickets} chamados (${item.shareLabel})`,
    isActive: selectedPriority === item.label,
    accentClass: priorityAccentMap[item.label] ?? "bg-slate-500/80",
  }));

  const volumeChartItems = report.dailyVolume.slice(-7).map((item) => ({
    label: shortDateLabel(item.date),
    value: item.totalTickets,
    href: buildFilterHref({ dateFrom, dateTo, day: item.date }, "daily-volume-section"),
    tooltip: `${formatDateLabel(item.date)}: ${item.totalTickets} chamados`,
    isActive: selectedDay === item.date,
  }));

  const visibleOrigins = selectedOrigin ? report.origins.filter((item) => item.label === selectedOrigin) : report.origins;
  const visiblePriorities = selectedPriority ? report.priorities.filter((item) => item.label === selectedPriority) : report.priorities;
  const visibleDailyVolume = selectedDay ? report.dailyVolume.filter((item) => item.date === selectedDay) : report.dailyVolume;

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-900/10 px-5 py-5 sm:px-6 lg:px-8">
          <BackToPanelLink className="mb-4" />
          <SectionHeader eyebrow="Gestao" title="Relatorios operacionais" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Leitura consolidada de volume, desempenho por inbox, produtividade por atendente e distribuicoes do periodo selecionado.
          </p>
        </div>

        <div className="border-b border-slate-900/10 px-5 py-5 sm:px-6 lg:px-8">
          <form className="grid gap-4 rounded-[0.72rem] border border-slate-900/8 bg-white/68 px-4 py-4 shadow-[0_12px_28px_rgba(148,163,184,0.1)] md:grid-cols-[1fr_1fr_auto_auto] md:items-end" method="GET" action="/relatorios">
            <FilterField label="De">
              <input
                type="date"
                name="dateFrom"
                defaultValue={report.filters.dateFrom}
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </FilterField>
            <FilterField label="Ate">
              <input
                type="date"
                name="dateTo"
                defaultValue={report.filters.dateTo}
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </FilterField>
            <button type="submit" className="crm-btn-primary text-sm">
              Atualizar relatorio
            </button>
            <a href={csvHref} className="crm-btn-secondary text-sm">
              Exportar CSV
            </a>
          </form>
        </div>

        <div className="grid gap-3 border-b border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.04))] px-5 py-5 sm:grid-cols-2 lg:px-8 xl:grid-cols-5">
          <MetricWrap><StatCard label="Chamados" value={String(report.summary.totalTickets)} detail="Volume total criado no periodo selecionado." /></MetricWrap>
          <MetricWrap><StatCard label="Abertos" value={String(report.summary.openTickets)} detail="Chamados ainda em fluxo operacional dentro do recorte." /></MetricWrap>
          <MetricWrap><StatCard label="Fechados" value={String(report.summary.closedTickets)} detail="Chamados encerrados no conjunto avaliado." /></MetricWrap>
          <MetricWrap><StatCard label="Portal" value={String(report.summary.portalTickets)} detail="Chamados abertos pelo portal do solicitante." /></MetricWrap>
          <MetricWrap><StatCard label="Resolucao media" value={report.summary.averageResolutionLabel} detail="Tempo medio entre abertura e fechamento dos chamados encerrados." /></MetricWrap>
        </div>

        <div className="grid gap-3 border-b border-slate-900/8 px-5 py-5 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <ComparisonCard
            label="Chamados"
            current={report.comparison.totalTickets.current}
            previous={report.comparison.totalTickets.previous}
            deltaLabel={report.comparison.totalTickets.deltaLabel}
            trend={report.comparison.totalTickets.trend}
            previousLabel={report.comparison.previousPeriodLabel}
          />
          <ComparisonCard
            label="Abertos"
            current={report.comparison.openTickets.current}
            previous={report.comparison.openTickets.previous}
            deltaLabel={report.comparison.openTickets.deltaLabel}
            trend={report.comparison.openTickets.trend}
            previousLabel={report.comparison.previousPeriodLabel}
          />
          <ComparisonCard
            label="Fechados"
            current={report.comparison.closedTickets.current}
            previous={report.comparison.closedTickets.previous}
            deltaLabel={report.comparison.closedTickets.deltaLabel}
            trend={report.comparison.closedTickets.trend}
            previousLabel={report.comparison.previousPeriodLabel}
          />
          <ComparisonCard
            label="Portal"
            current={report.comparison.portalTickets.current}
            previous={report.comparison.portalTickets.previous}
            deltaLabel={report.comparison.portalTickets.deltaLabel}
            trend={report.comparison.portalTickets.trend}
            previousLabel={report.comparison.previousPeriodLabel}
          />
        </div>

        <div className="grid gap-4 border-b border-slate-900/8 px-5 py-5 md:grid-cols-3 lg:px-8">
          <MiniChartCard
            eyebrow="Grafico"
            title="Origens principais"
            subtitle="Clique para filtrar a tabela de origens."
            items={originChartItems}
            emptyLabel="Sem volume para exibir."
            defaultAccentClass="bg-sky-500/80"
          />
          <MiniChartCard
            eyebrow="Grafico"
            title="Prioridades"
            subtitle="Clique para filtrar a tabela de prioridades."
            items={priorityChartItems}
            emptyLabel="Sem prioridades no recorte."
            defaultAccentClass="bg-amber-500/80"
          />
          <MiniChartCard
            eyebrow="Grafico"
            title="Ultimos 7 dias"
            subtitle="Clique para filtrar a tabela de volume diario."
            items={volumeChartItems}
            emptyLabel="Sem atividade recente."
            defaultAccentClass="bg-emerald-500/80"
          />
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.15fr_1fr] lg:px-8">
          <section className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="border-b border-slate-900/10 px-4 py-4 sm:px-5">
              <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">Desempenho por inbox</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Volume, carteira aberta, fechamentos e tempo medio por fila.</p>
            </div>
            <div className="crm-scroll max-h-[62vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-900/10 text-sm">
                <thead className="bg-slate-50/80 text-left text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Inbox</th>
                    <th className="px-4 py-3">Chamados</th>
                    <th className="px-4 py-3">Abertos</th>
                    <th className="px-4 py-3">Fechados</th>
                    <th className="px-4 py-3">Resolucao media</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {report.inboxes.map((item) => (
                    <tr key={item.inboxId} className="bg-white/70 text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-950">{item.inboxName}</td>
                      <td className="px-4 py-3">{item.totalTickets}</td>
                      <td className="px-4 py-3">{item.openTickets}</td>
                      <td className="px-4 py-3">{item.closedTickets}</td>
                      <td className="px-4 py-3">{item.averageResolutionLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="border-b border-slate-900/10 px-4 py-4 sm:px-5">
              <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">Produtividade por atendente</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Tickets vinculados e registros operacionais produzidos no periodo.</p>
            </div>
            <div className="crm-scroll max-h-[62vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-900/10 text-sm">
                <thead className="bg-slate-50/80 text-left text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Atendente</th>
                    <th className="px-4 py-3">Atribuidos</th>
                    <th className="px-4 py-3">Criados</th>
                    <th className="px-4 py-3">Interacoes</th>
                    <th className="px-4 py-3">Reagendamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {report.agents.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={5}>Nenhum registro operacional encontrado para o periodo atual.</td>
                    </tr>
                  ) : report.agents.map((item) => (
                    <tr key={item.userId} className="bg-white/70 text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">{item.name}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.role}</div>
                      </td>
                      <td className="px-4 py-3">{item.assignedTickets}</td>
                      <td className="px-4 py-3">{item.createdTickets}</td>
                      <td className="px-4 py-3">{item.interactions}</td>
                      <td className="px-4 py-3">{item.scheduledReturns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="grid gap-5 border-t border-slate-900/8 px-5 py-5 lg:grid-cols-2 lg:px-8">
          <section id="origins-section" className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="border-b border-slate-900/10 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">Distribuicao por origem</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Canal de entrada dos chamados no periodo selecionado.</p>
                </div>
                {selectedOrigin ? (
                  <a href={buildFilterHref({ dateFrom, dateTo }, "origins-section")} className="rounded-full border border-slate-900/10 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-900/20 hover:text-slate-950">
                    Limpar filtro
                  </a>
                ) : null}
              </div>
              {selectedOrigin ? (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-sky-700">Filtrado por: {selectedOrigin}</p>
              ) : null}
            </div>
            <div className="crm-scroll max-h-[48vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-900/10 text-sm">
                <thead className="bg-slate-50/80 text-left text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Chamados</th>
                    <th className="px-4 py-3">Participacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {visibleOrigins.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={3}>Nenhum registro encontrado para esse filtro.</td>
                    </tr>
                  ) : visibleOrigins.map((item) => (
                    <tr key={item.label} className="bg-white/70 text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-950">{item.label}</td>
                      <td className="px-4 py-3">{item.totalTickets}</td>
                      <td className="px-4 py-3">{item.shareLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="priorities-section" className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="border-b border-slate-900/10 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">Distribuicao por prioridade</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Peso operacional do periodo por nivel de prioridade.</p>
                </div>
                {selectedPriority ? (
                  <a href={buildFilterHref({ dateFrom, dateTo }, "priorities-section")} className="rounded-full border border-slate-900/10 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-900/20 hover:text-slate-950">
                    Limpar filtro
                  </a>
                ) : null}
              </div>
              {selectedPriority ? (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-amber-700">Filtrado por: {selectedPriority}</p>
              ) : null}
            </div>
            <div className="crm-scroll max-h-[48vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-900/10 text-sm">
                <thead className="bg-slate-50/80 text-left text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Chamados</th>
                    <th className="px-4 py-3">Participacao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {visiblePriorities.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={3}>Nenhum registro encontrado para esse filtro.</td>
                    </tr>
                  ) : visiblePriorities.map((item) => (
                    <tr key={item.label} className="bg-white/70 text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-950">{item.label}</td>
                      <td className="px-4 py-3">{item.totalTickets}</td>
                      <td className="px-4 py-3">{item.shareLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-900/8 px-5 py-5 lg:px-8">
          <section id="daily-volume-section" className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <div className="border-b border-slate-900/10 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">Volume diario</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Evolucao diaria de chamados, portal e fechamentos no periodo.</p>
                </div>
                {selectedDay ? (
                  <a href={buildFilterHref({ dateFrom, dateTo }, "daily-volume-section")} className="rounded-full border border-slate-900/10 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-900/20 hover:text-slate-950">
                    Limpar filtro
                  </a>
                ) : null}
              </div>
              {selectedDay ? (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-emerald-700">Filtrado por: {formatDateLabel(selectedDay)}</p>
              ) : null}
            </div>
            <div className="crm-scroll max-h-[48vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-900/10 text-sm">
                <thead className="bg-slate-50/80 text-left text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Chamados</th>
                    <th className="px-4 py-3">Portal</th>
                    <th className="px-4 py-3">Fechados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/8">
                  {visibleDailyVolume.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={4}>Nenhum chamado encontrado para o periodo atual.</td>
                    </tr>
                  ) : visibleDailyVolume.map((item) => (
                    <tr key={item.date} className="bg-white/70 text-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-950">{formatDateLabel(item.date)}</td>
                      <td className="px-4 py-3">{item.totalTickets}</td>
                      <td className="px-4 py-3">{item.portalTickets}</td>
                      <td className="px-4 py-3">{item.closedTickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Panel>
    </AppShell>
  );
}

function buildCsvHref(dateFrom: string, dateTo: string) {
  const params = new URLSearchParams({ dateFrom, dateTo });
  return `/api/reports/operational.csv?${params.toString()}`;
}

function buildFilterHref(
  filters: { dateFrom: string; dateTo: string; origin?: string; priority?: string; day?: string },
  anchor?: string,
) {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);

  if (filters.origin) {
    params.set("origin", filters.origin);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.day) {
    params.set("day", filters.day);
  }

  const hash = anchor ? `#${anchor}` : "";
  return `/relatorios?${params.toString()}${hash}`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function shortDateLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function MetricWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
      {children}
    </div>
  );
}

function ComparisonCard({
  label,
  current,
  previous,
  deltaLabel,
  trend,
  previousLabel,
}: {
  label: string;
  current: number;
  previous: number;
  deltaLabel: string;
  trend: "up" | "down" | "flat";
  previousLabel: string;
}) {
  const toneClass = trend === "up" ? "text-emerald-700" : trend === "down" ? "text-rose-700" : "text-slate-500";
  const prefix = trend === "up" ? "Subiu" : trend === "down" ? "Caiu" : "Estavel";

  return (
    <section className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 px-4 py-4 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
      <p className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-500">Comparativo</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-950">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{current}</p>
        </div>
        <div className={`text-xs font-medium uppercase tracking-[0.16em] ${toneClass}`}>{deltaLabel}</div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{prefix} vs. {previous} no periodo {previousLabel}.</p>
    </section>
  );
}

function MiniChartCard({
  eyebrow,
  title,
  subtitle,
  items,
  emptyLabel,
  defaultAccentClass,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: MiniChartItem[];
  emptyLabel: string;
  defaultAccentClass: string;
}) {
  const maxValue = items.reduce((highest, item) => Math.max(highest, item.value), 0);

  return (
    <section className="overflow-hidden rounded-[0.76rem] border border-slate-900/8 bg-white/74 shadow-[0_16px_36px_rgba(148,163,184,0.12)]">
      <div className="border-b border-slate-900/8 px-4 py-3">
        <p className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <p className="mt-2 text-sm font-medium text-slate-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{subtitle}</p>
      </div>

      <div className="grid gap-3 px-4 py-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : items.map((item) => {
          const width = maxValue > 0 ? Math.max(10, Math.round((item.value / maxValue) * 100)) : 0;
          return (
            <a
              key={`${item.label}-${item.value}`}
              href={item.href}
              title={item.tooltip}
              className={`group grid gap-1.5 rounded-[0.62rem] border px-2.5 py-2 transition duration-150 ${
                item.isActive
                  ? "border-slate-900/18 bg-slate-900/[0.05] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  : "border-transparent hover:-translate-y-0.5 hover:border-slate-900/12 hover:bg-slate-900/[0.03] hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-slate-600 transition group-hover:text-slate-800">{item.label}</span>
                <span className="font-medium text-slate-950">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full rounded-full transition-[width,filter] duration-150 group-hover:brightness-95 ${item.accentClass ?? defaultAccentClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

const priorityAccentMap: Record<string, string> = {
  Urgente: "bg-rose-500/85",
  Alta: "bg-amber-500/85",
  Media: "bg-sky-500/85",
  Baixa: "bg-emerald-500/85",
};
