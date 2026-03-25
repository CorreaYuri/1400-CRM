import Link from "next/link";
import type {
  ListPagination,
  TicketListFilterOptions,
  TicketListFilters,
  TicketListItem,
} from "@/modules/tickets/server/types";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { StatCard } from "@/shared/components/stat-card";

type TicketListViewProps = {
  tickets: TicketListItem[];
  filters: TicketListFilters;
  filterOptions: TicketListFilterOptions;
  pagination: ListPagination;
};

const statusFilters = ["Todos", "Na fila", "Em atendimento", "Aguardando retorno"] as const;

export function TicketListView({ tickets, filters, filterOptions, pagination }: TicketListViewProps) {
  const queuedCount = tickets.filter((ticket) => ticket.status === "Na fila").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "Em atendimento").length;
  const waitingReturnCount = tickets.filter((ticket) => ticket.status === "Aguardando retorno").length;

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-900/10 px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <BackToPanelLink href="/" label="Voltar para hoje" className="mb-4" />
              <SectionHeader eyebrow="Operacao" title="Fila de chamados" />
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Visualizacao operacional dos chamados ativos, com prioridade, responsavel, inbox e proxima retomada em leitura rapida.
              </p>
            </div>

            <Link href="/tickets/novo" className="crm-btn-primary text-sm">
              Novo chamado
            </Link>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.04))] px-5 py-5 sm:grid-cols-2 lg:px-8 xl:grid-cols-4">
          <div className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
            <StatCard
              label="Total"
              value={String(pagination.totalItems).padStart(2, "0")}
              detail="Volume total retornado pelos filtros aplicados na busca atual."
            />
          </div>
          <div className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
            <StatCard
              label="Na fila"
              value={String(queuedCount).padStart(2, "0")}
              detail="Itens desta pagina aguardando triagem ou assuncao por um atendente."
            />
          </div>
          <div className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
            <StatCard
              label="Atendimento"
              value={String(inProgressCount).padStart(2, "0")}
              detail="Itens desta pagina ja em tratamento ativo pelo setor responsavel."
            />
          </div>
          <div className="overflow-hidden rounded-[0.72rem] border border-slate-900/8 bg-white/76 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
            <StatCard
              label="Retorno"
              value={String(waitingReturnCount).padStart(2, "0")}
              detail="Itens desta pagina pausados ate uma nova acao ou prazo combinado."
            />
          </div>
        </div>

        <div className="border-b border-slate-900/10 px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[0.72rem] border border-slate-900/8 bg-white/62 px-4 py-4 shadow-[0_10px_26px_rgba(148,163,184,0.1)]">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((label) => {
                const isAll = label === "Todos";
                const isActive = isAll ? filters.status === "" : filters.status === label;

                return (
                  <Link
                    key={label}
                    href={buildFilterHref(filters, { status: isAll ? "" : label })}
                    className={isActive
                      ? "crm-chip-active px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em]"
                      : "crm-chip-muted px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em]"}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <p className="text-sm leading-6 text-slate-600">
              Pagina {pagination.page} de {pagination.totalPages} com {pagination.totalItems} chamados encontrados.
            </p>
          </div>

          <form className="mt-4 grid gap-4 rounded-[0.72rem] border border-slate-900/8 bg-white/68 px-4 py-4 shadow-[0_12px_28px_rgba(148,163,184,0.1)] xl:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_auto_auto] xl:items-end" action="/tickets" method="GET">
            <FilterField label="Buscar no banco">
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="CH-2048, assunto, solicitante, email ou telefone"
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
            </FilterField>

            <FilterField label="Inbox">
              <select
                name="inbox"
                defaultValue={filters.inbox}
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
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
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
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
                className="w-full rounded-[0.58rem] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Todos</option>
                {filterOptions.owners.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FilterField>

            <input type="hidden" name="status" value={filters.status} />

            <button type="submit" className="crm-btn-primary text-sm">
              Aplicar
            </button>

            <Link href="/tickets" className="crm-btn-secondary text-sm">
              Limpar
            </Link>
          </form>
        </div>

        <div className="crm-scroll max-h-[68vh] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          {tickets.length === 0 ? (
            <div className="rounded-[0.82rem] border border-slate-900/8 bg-white/72 px-5 py-10 text-sm leading-7 text-slate-600 shadow-[0_16px_36px_rgba(148,163,184,0.12)] sm:px-6 lg:px-8">
              Nenhum chamado encontrado com os filtros atuais.
            </div>
          ) : null}

          <div className="grid gap-3">
            {tickets.map((ticket, index) => {
              const isFeatured = index === 0;

              return (
                <article
                  key={ticket.id}
                  className={isFeatured
                    ? "overflow-hidden rounded-[0.58rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.22),transparent_28%),linear-gradient(180deg,#020617_0%,#111827_52%,#050816_100%)] px-5 py-5 text-zinc-100 shadow-[0_24px_64px_rgba(15,23,42,0.22)] sm:px-6 lg:px-8"
                    : "overflow-hidden rounded-[0.58rem] border border-slate-900/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.78))] px-5 py-5 text-slate-950 shadow-[0_18px_44px_rgba(148,163,184,0.14)] sm:px-6 lg:px-8"}
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.92fr)_auto] xl:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={isFeatured ? badgeDarkClass("default") : badgeLightClass("default")}>
                          {ticket.id}
                        </span>
                        <span className={isFeatured ? badgeDarkClass("default") : badgeLightClass("default")}>
                          {ticket.priority}
                        </span>
                        <span className={isFeatured ? badgeDarkClass("default") : badgeLightClass("default")}>
                          {ticket.status}
                        </span>
                        {ticket.riskLabel ? (
                          <span className={riskBadgeClass(isFeatured, ticket.riskTone)}>
                            {ticket.riskLabel}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-4 font-heading text-2xl uppercase tracking-[-0.05em] sm:text-[2rem]">
                        {ticket.customer}
                      </h2>
                      <p className={isFeatured ? "mt-3 max-w-3xl text-sm leading-7 text-zinc-300" : "mt-3 max-w-3xl text-sm leading-7 text-slate-600"}>
                        {ticket.subject}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <InfoCard label="Inbox" value={ticket.inbox} dark={isFeatured} />
                      <InfoCard label="Responsavel" value={ticket.owner} dark={isFeatured} />
                      <InfoCard label="Proxima acao" value={ticket.schedule} dark={isFeatured} fullWidth />
                    </div>

                    <div className="flex xl:justify-end">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className={isFeatured ? "crm-btn-secondary text-[0.62rem]" : "crm-btn-primary text-[0.62rem]"}
                      >
                        Abrir chamado
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <PaginationBar basePath="/tickets" filters={filters} pagination={pagination} />
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
  filters: TicketListFilters;
  pagination: ListPagination;
}) {
  const startItem = pagination.totalItems > 0 ? pagination.pageSize * (pagination.page - 1) + 1 : 0;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 px-5 py-4 sm:px-6 lg:px-8">
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

function buildFilterHref(filters: TicketListFilters, updates: Partial<TicketListFilters>, page = 1, basePath = "/tickets") {
  const params = new URLSearchParams();
  const nextFilters = { ...filters, ...updates };

  if (nextFilters.search) {
    params.set("search", nextFilters.search);
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

  if (nextFilters.status) {
    params.set("status", nextFilters.status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function badgeDarkClass(tone: "default") {
  return tone === "default"
    ? "rounded-[0.58rem] border border-white/14 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-200"
    : "";
}

function badgeLightClass(tone: "default") {
  return tone === "default"
    ? "rounded-[0.58rem] border border-slate-900/10 bg-white/84 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-slate-700"
    : "";
}

function riskBadgeClass(isDark: boolean, tone: TicketListItem["riskTone"]) {
  if (tone === "critical") {
    return isDark
      ? "rounded-[0.58rem] border border-rose-200 bg-rose-100 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-rose-950"
      : "rounded-[0.58rem] border border-rose-300 bg-rose-50 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-rose-900";
  }

  return isDark
    ? "rounded-[0.58rem] border border-amber-200 bg-amber-100 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-amber-950"
    : "rounded-[0.58rem] border border-amber-300 bg-amber-50 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-amber-900";
}

function InfoCard({
  label,
  value,
  dark,
  fullWidth = false,
}: {
  label: string;
  value: string;
  dark: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${dark ? "border border-white/10 bg-white/6" : "border border-slate-900/8 bg-white/78"} rounded-[0.66rem] px-4 py-4 shadow-[0_12px_28px_rgba(148,163,184,0.08)] ${fullWidth ? "sm:col-span-2 xl:col-span-1" : ""}`}>
      <p className={`font-heading text-[0.58rem] uppercase tracking-[0.22em] ${dark ? "text-zinc-500" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-sm leading-6 ${dark ? "text-zinc-200" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
