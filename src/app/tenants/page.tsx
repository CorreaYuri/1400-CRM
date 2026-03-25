import Link from "next/link";
import { AppShell } from "@/shared/components/app-shell";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { SwitchTenantButton } from "@/modules/tenants/components/switch-tenant-button";
import { TenantManagementActions } from "@/modules/tenants/components/tenant-management-actions";
import { getTenantManagementOverview, type TenantManagementSummary } from "@/modules/tenants/server/tenant-management-service";
import { requirePlatformPageSession } from "@/server/auth/platform-access";

type TenantsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function resolveStatusFilter(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (normalized === "active" || normalized === "inactive") {
    return normalized;
  }

  return "all" as const;
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const session = await requirePlatformPageSession();
  const tenants = await getTenantManagementOverview(session.user.tenantId);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusFilter = resolveStatusFilter(resolvedSearchParams?.status);
  const filteredTenants = tenants.filter((tenant) => {
    if (statusFilter === "active") {
      return tenant.isActive;
    }

    if (statusFilter === "inactive") {
      return !tenant.isActive;
    }

    return true;
  });

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionHeader eyebrow="Plataforma" title="Tenants do SaaS" />
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
                Area restrita para a equipe interna acompanhar empresas atendidas, validar saude operacional
                de cada ambiente e entrar no tenant certo quando for preciso atuar no suporte.
              </p>
            </div>

            <Link
              href="/cadastro"
              className="crm-btn-primary text-[0.68rem]"
            >
              Criar novo tenant
            </Link>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterLink href="/tenants" active={statusFilter === "all"} label="Todos" />
              <FilterLink href="/tenants?status=active" active={statusFilter === "active"} label="Ativos" />
              <FilterLink href="/tenants?status=inactive" active={statusFilter === "inactive"} label="Desativados" />
            </div>

            {filteredTenants.length === 0 ? (
              <div className="border border-dashed border-slate-950/40 bg-white/60 px-5 py-6 text-sm leading-6 text-slate-700">
                Nenhum tenant encontrado para este filtro.
              </div>
            ) : (
              filteredTenants.map((tenant: TenantManagementSummary) => (
                <article
                  key={tenant.id}
                  className={`grid gap-4 border px-5 py-5 ${
                    tenant.isCurrentTenant
                      ? "border-amber-300 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(255,255,255,0.92))]"
                      : tenant.isActive
                        ? "border-slate-950 bg-white/70"
                        : "border-slate-950/18 bg-slate-100/90"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-2xl uppercase tracking-[-0.06em] text-slate-950">
                          {tenant.name}
                        </h2>
                        {tenant.isCurrentTenant ? (
                          <span className="rounded-[0.55rem] border border-amber-400/70 bg-amber-200/60 px-3 py-1 font-heading text-[0.62rem] uppercase tracking-[0.22em] text-amber-950">
                            Tenant atual
                          </span>
                        ) : null}
                        <span className={`rounded-[0.55rem] border px-3 py-1 font-heading text-[0.62rem] uppercase tracking-[0.22em] ${tenant.isActive ? "border-emerald-300/70 bg-emerald-100 text-emerald-950" : "border-slate-300 bg-slate-200 text-slate-700"}`}>
                          {tenant.isActive ? "Ativo" : "Desativado"}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-sm text-slate-700">{tenant.slug}</p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
                        Criado em {formatDate(tenant.createdAt)}. Admin principal: {tenant.primaryAdminName ?? "nao definido"}
                        {tenant.primaryAdminEmail ? ` (${tenant.primaryAdminEmail})` : ""}.
                      </p>
                    </div>

                    {tenant.isCurrentTenant ? (
                      <div className="border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        Este e o tenant aberto na sua sessao agora.
                      </div>
                    ) : (
                      <div className="grid gap-2 justify-items-start">
                        {tenant.isActive ? <SwitchTenantButton tenantId={tenant.id} /> : null}
                        <TenantManagementActions
                          tenantId={tenant.id}
                          tenantName={tenant.name}
                          isActive={tenant.isActive}
                          isCurrentTenant={tenant.isCurrentTenant}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="border border-slate-950/10 bg-white/70 px-4 py-4">
                      <p className="font-heading text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
                        Usuarios ativos
                      </p>
                      <p className="mt-2 font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">
                        {tenant.activeUsersCount.toString().padStart(2, "0")}
                      </p>
                    </div>
                    <div className="border border-slate-950/10 bg-white/70 px-4 py-4">
                      <p className="font-heading text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
                        Inboxes ativas
                      </p>
                      <p className="mt-2 font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">
                        {tenant.activeInboxesCount.toString().padStart(2, "0")}
                      </p>
                    </div>
                    <div className="border border-slate-950/10 bg-white/70 px-4 py-4">
                      <p className="font-heading text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">
                        Chamados abertos
                      </p>
                      <p className="mt-2 font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">
                        {tenant.openTicketsCount.toString().padStart(2, "0")}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-700">
                    Ultimo acesso do admin principal: {tenant.primaryAdminLastLoginAt ? formatDate(tenant.primaryAdminLastLoginAt) : "ainda sem login registrado"}.
                  </p>
                </article>
              ))
            )}
          </div>

          <div className="grid gap-4">
            <aside className="border border-slate-950 bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-5 py-5 text-zinc-100">
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">
                Regra de acesso
              </p>
              <h2 className="mt-3 font-heading text-2xl uppercase tracking-[-0.06em] text-zinc-50">
                Somente plataforma
              </h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
                <p>Usuarios do tenant nao veem esta pagina nem o item de menu correspondente.</p>
                <p>O backend tambem bloqueia o acesso direto para qualquer email fora da lista interna autorizada.</p>
                <p>Use a variavel `PLATFORM_ADMIN_EMAILS` para definir quem da sua equipe pode operar essa area.</p>
              </div>
            </aside>

            <aside className="border border-slate-950 bg-white/70 px-5 py-5">
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">
                Acoes sensiveis
              </p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                <p>Desativar bloqueia login e novas aberturas pelo portal.</p>
                <p>Reativar libera novamente acesso e operacao do tenant.</p>
                <p>Apagar remove definitivamente o tenant e os dados vinculados.</p>
              </div>
            </aside>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={active ? "crm-btn-primary text-[0.64rem]" : "crm-btn-secondary text-[0.64rem]"}
    >
      {label}
    </Link>
  );
}
