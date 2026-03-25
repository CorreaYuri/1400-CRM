import Link from "next/link";
import type {
  ListPagination,
  TodayQueueFilterOptions,
  TodayQueueFilters,
  TodayQueueItem,
} from "@/modules/tickets/server/types";
import { AppShell } from "@/shared/components/app-shell";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { StatCard } from "@/shared/components/stat-card";

type TodayQueueViewProps = {
  items: TodayQueueItem[];
  filters: TodayQueueFilters;
  filterOptions: TodayQueueFilterOptions;
  pagination: ListPagination;
};

const sourceFilters = [
  { label: "Todos", value: "ALL" },
  { label: "Novos hoje", value: "NEW_TODAY" },
  { label: "Retornos hoje", value: "SCHEDULED_TODAY" },
] as const;

export function TodayQueueView({ items, filters, filterOptions, pagination }: TodayQueueViewProps) {
  const scheduledToday = items.filter((item) => item.sourceKey === "SCHEDULED_TODAY").length;
  const newToday = items.filter((item) => item.sourceKey === "NEW_TODAY").length;
  const inProgress = items.filter((item) => item.status === "Em atendimento").length;

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Fila diaria" title="Hoje" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
            Visao consolidada dos pedidos que precisam de acao hoje, unindo entradas novas e retornos programados para o dia.
          </p>
        </div>

        <div className="grid gap-px border-b border-slate-950 bg-slate-950 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Hoje"
            value={String(pagination.totalItems).padStart(2, "0")}
            detail="Volume total que entrou no radar operacional deste dia com os filtros atuais."
          />
          <StatCard
            label="Novos"
            value={String(newToday).padStart(2, "0")}
            detail="Itens desta pagina que entraram hoje e ainda estao em fluxo."
          />
          <StatCard
            label="Retornos"
            value={String(scheduledToday).padStart(2, "0")}
            detail="Itens desta pagina reagendados para hoje e de volta para operacao."
          />
          <StatCard
            label="Tratando"
            value={String(inProgress).padStart(2, "0")}
            detail="Itens desta pagina ja em atendimento no momento."
          />
        </div>

        <div className="border-b border-slate-950 px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {sourceFilters.map((sourceFilter) => (
                <Link
                  key={sourceFilter.value}
                  href={buildFilterHref(filters, { source: sourceFilter.value })}
                  className={filters.source === sourceFilter.value
                    ? "crm-chip-active px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em]"
                    : "crm-chip-muted px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em]"}
                >
                  {sourceFilter.label}
                </Link>
              ))}
            </div>

            <p className="max-w-xl text-sm leading-6 text-zinc-600">
              Pagina {pagination.page} de {pagination.totalPages} com {pagination.totalItems} chamados encontrados para hoje.
            </p>
          </div>

          <form className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_1fr_1fr_1fr_auto_auto] xl:items-end" action="/" method="GET">
            <FilterField label="Buscar no banco">
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="CH-2048, solicitante, email ou telefone"
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-zinc-500"
              />
            </FilterField>

            <FilterField label="Inbox">
              <select
                name="inbox"
                defaultValue={filters.inbox}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Todas</option>
                {filterOptions.inboxes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Prioridade">
              <select
                name="priority"
                defaultValue={filters.priority}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Todas</option>
                {filterOptions.priorities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Responsavel">
              <select
                name="owner"
                defaultValue={filters.owner}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Todos</option>
                {filterOptions.owners.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FilterField>

            <input type="hidden" name="source" value={filters.source} />

            <button
              type="submit"
              className="crm-btn-primary text-sm"
            >
              Aplicar
            </button>

            <Link
              href="/"
              className="crm-btn-secondary text-sm"
            >
              Limpar
            </Link>
          </form>
        </div>

        <div className="crm-scroll max-h-[68vh] overflow-y-auto divide-y divide-slate-950">
          {items.length === 0 ? (
            <div className="px-5 py-10 text-sm leading-7 text-slate-700 sm:px-6 lg:px-8">
              Nenhum chamado novo ou agendado para hoje com os filtros atuais.
            </div>
          ) : null}

          {items.map((item, index) => (
            <article
              key={`${item.id}-${item.sourceKey}`}
              className={index === 0 ? "bg-slate-950 px-5 py-5 text-zinc-100 sm:px-6 lg:px-8" : "bg-zinc-100 px-5 py-5 text-slate-950 sm:px-6 lg:px-8"}
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)_auto] xl:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={badgeClass(index === 0)}>{item.id}</span>
                    <span className={badgeClass(index === 0)}>{item.priority}</span>
                    <span className={badgeClass(index === 0, item.sourceKey === "SCHEDULED_TODAY")}>{item.source}</span>
                  </div>

                  <h2 className="mt-4 font-heading text-2xl uppercase tracking-[-0.05em]">
                    {item.customer}
                  </h2>
                  <p className={index === 0 ? "mt-3 max-w-3xl text-sm leading-7 text-zinc-300" : "mt-3 max-w-3xl text-sm leading-7 text-slate-700"}>
                    {item.subject}
                  </p>
                </div>

                <div className={index === 0 ? "grid gap-px border border-slate-800 bg-slate-800 sm:grid-cols-2 xl:grid-cols-1" : "grid gap-px border border-slate-950 bg-slate-950 sm:grid-cols-2 xl:grid-cols-1"}>
                  <div className={index === 0 ? "bg-slate-950 px-4 py-4" : "bg-zinc-100 px-4 py-4"}>
                    <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                      Origem do dia
                    </p>
                    <p className={valueClass(index === 0)}>{item.dueLabel}</p>
                  </div>
                  <div className={index === 0 ? "bg-slate-950 px-4 py-4" : "bg-zinc-100 px-4 py-4"}>
                    <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                      Inbox / dono
                    </p>
                    <p className={valueClass(index === 0)}>{item.inbox}</p>
                    <p className={index === 0 ? "mt-2 text-sm text-zinc-400" : "mt-2 text-sm text-zinc-600"}>{item.owner}</p>
                  </div>
                  <div className={index === 0 ? "bg-slate-950 px-4 py-4 sm:col-span-2 xl:col-span-1" : "bg-zinc-100 px-4 py-4 sm:col-span-2 xl:col-span-1"}>
                    <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                      Abordagem
                    </p>
                    <p className={index === 0 ? "mt-2 text-sm leading-6 text-zinc-200" : "mt-2 text-sm leading-6 text-slate-800"}>{item.actionHint}</p>
                    <p className={index === 0 ? "mt-2 text-sm text-zinc-400" : "mt-2 text-sm text-zinc-600"}>{item.status}</p>
                  </div>
                </div>

                <div className="flex xl:justify-end">
                  <Link
                    href={`/tickets/${item.id}`}
                    className={index === 0 ? "inline-flex border border-zinc-100 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 transition-colors hover:bg-slate-900" : "inline-flex border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 transition-colors hover:bg-zinc-200"}
                  >
                    Abrir para tratar
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <PaginationBar basePath="/" filters={filters} pagination={pagination} />
      </Panel>
    </AppShell>
  );
}

function PaginationBar({
  basePath,
  filters,
  pagination,
}: {
  basePath: string;
  filters: TodayQueueFilters;
  pagination: ListPagination;
}) {
  const startItem = pagination.totalItems > 0 ? pagination.pageSize * (pagination.page - 1) + 1 : 0;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-950 px-5 py-4 sm:px-6 lg:px-8">
      <p className="text-sm text-slate-600">
        Mostrando {startItem} a {endItem} de {pagination.totalItems} chamados.
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={pagination.hasPreviousPage ? buildFilterHref(filters, {}, pagination.page - 1, basePath) : buildFilterHref(filters, {}, pagination.page, basePath)}
          aria-disabled={!pagination.hasPreviousPage}
          className={pagination.hasPreviousPage ? "crm-btn-secondary text-[0.62rem]" : "crm-btn-secondary pointer-events-none text-[0.62rem] opacity-50"}
        >
          Anterior
        </Link>
        <span className="min-w-20 text-center font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
          Pagina {pagination.page}/{pagination.totalPages}
        </span>
        <Link
          href={pagination.hasNextPage ? buildFilterHref(filters, {}, pagination.page + 1, basePath) : buildFilterHref(filters, {}, pagination.page, basePath)}
          aria-disabled={!pagination.hasNextPage}
          className={pagination.hasNextPage ? "crm-btn-primary text-[0.62rem]" : "crm-btn-primary pointer-events-none text-[0.62rem] opacity-50"}
        >
          Proxima
        </Link>
      </div>
    </div>
  );
}

function buildFilterHref(filters: TodayQueueFilters, updates: Partial<TodayQueueFilters>, page = 1, basePath = "/") {
  const params = new URLSearchParams();
  const nextFilters = { ...filters, ...updates };

  if (nextFilters.search) {
    params.set("search", nextFilters.search);
  }

  if (nextFilters.source !== "ALL") {
    params.set("source", nextFilters.source);
  }

  if (nextFilters.inbox) {
    params.set("inbox", nextFilters.inbox);
  }

  if (nextFilters.priority) {
    params.set("priority", nextFilters.priority);
  }

  if (nextFilters.owner) {
    params.set("owner", nextFilters.owner);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function badgeClass(isDark: boolean, highlight = false) {
  if (highlight && isDark) {
    return "border border-zinc-100 bg-zinc-100 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-slate-950";
  }

  if (highlight) {
    return "border border-slate-950 bg-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-100";
  }

  return isDark
    ? "border border-slate-700 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-300"
    : "border border-slate-950 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-600";
}

function valueClass(isDark: boolean) {
  return isDark ? "mt-2 text-sm text-zinc-200" : "mt-2 text-sm text-slate-800";
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
