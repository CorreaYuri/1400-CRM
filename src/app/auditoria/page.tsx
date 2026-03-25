import { AuditFilterForm } from "@/modules/audit/components/audit-filter-form";
import { AuditTimeline } from "@/modules/audit/components/audit-timeline";
import { getAuditEvents, getAuditFilterOptions } from "@/modules/audit/server/audit-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { requirePageRole, requirePageSession } from "@/server/auth/session";

type AuditoriaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  await requirePageRole(["ADMIN", "MANAGER"]);
  const session = await requirePageSession();
  const rawFilters = (await searchParams) ?? {};
  const [{ items, filters, pagination }, options] = await Promise.all([
    getAuditEvents(session.user.tenantId, rawFilters),
    getAuditFilterOptions(session.user.tenantId),
  ]);

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5">
          <BackToPanelLink className="mb-4" />
          <SectionHeader eyebrow="Administracao" title="Auditoria" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
            Trilhas das acoes sensiveis do tenant, com filtros por entidade, acao, autor e periodo para acelerar investigacoes operacionais.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <AuditFilterForm filters={filters} options={options} />
          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">
            <span>{pagination.totalItems} evento(s) encontrados.</span>
            <span>Pagina {pagination.page} de {pagination.totalPages}</span>
          </div>
          <AuditTimeline events={items} />
          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-950 bg-white px-4 py-3">
            <p className="text-sm text-slate-700">
              Mostrando {pagination.totalItems > 0 ? pagination.pageSize * (pagination.page - 1) + 1 : 0} a {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de {pagination.totalItems} eventos.
            </p>
            <div className="flex items-center gap-2">
              <a
                href={buildAuditHref(filters, pagination.page - 1)}
                aria-disabled={!pagination.hasPreviousPage}
                className={pagination.hasPreviousPage ? "crm-btn-secondary text-[0.62rem]" : "crm-btn-secondary pointer-events-none text-[0.62rem] opacity-50"}
              >
                Anterior
              </a>
              <span className="min-w-20 text-center font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                Pagina {pagination.page}/{pagination.totalPages}
              </span>
              <a
                href={buildAuditHref(filters, pagination.page + 1)}
                aria-disabled={!pagination.hasNextPage}
                className={pagination.hasNextPage ? "crm-btn-primary text-[0.62rem]" : "crm-btn-primary pointer-events-none text-[0.62rem] opacity-50"}
              >
                Proxima
              </a>
            </div>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}

function buildAuditHref(
  filters: {
    search: string;
    entityType: string;
    action: string;
    actorId: string;
    dateFrom: string;
    dateTo: string;
  },
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/auditoria?${query}` : "/auditoria";
}
