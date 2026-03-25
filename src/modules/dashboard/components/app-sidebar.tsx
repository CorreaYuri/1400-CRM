import { SidebarNav } from "@/modules/dashboard/components/sidebar-nav";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import type { NavigationItem } from "@/modules/dashboard/types";
import { UserAvatar } from "@/shared/components/user-avatar";
import type { UserRole } from "@prisma/client";

type SessionEnvironment = "tenant" | "platform" | "support";

type AppSidebarProps = {
  mainNavigation: NavigationItem[];
  adminNavigation: NavigationItem[];
  showTenantManagement: boolean;
  sessionEnvironment: SessionEnvironment;
  currentTenant: {
    id: string;
    name: string;
    slug: string;
    isSupportContext: boolean;
  };
  currentUser: {
    name: string;
    email: string;
    role: UserRole;
    avatarUrl: string | null;
  };
};

const environmentBadgeMap: Record<
  SessionEnvironment,
  {
    label: string;
    className: string;
  }
> = {
  tenant: {
    label: "Cliente",
    className: "border border-sky-300/35 bg-sky-300/12 text-sky-100",
  },
  platform: {
    label: "Plataforma",
    className: "border border-emerald-300/35 bg-emerald-300/12 text-emerald-100",
  },
  support: {
    label: "Suporte",
    className: "border border-amber-300/35 bg-amber-300/12 text-amber-100",
  },
};

export function AppSidebar({
  mainNavigation,
  adminNavigation,
  showTenantManagement,
  sessionEnvironment,
  currentTenant,
  currentUser,
}: AppSidebarProps) {
  const canAccessAdmin = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
  const visibleAdminNavigation = showTenantManagement
    ? adminNavigation
    : adminNavigation.filter((item) => item.href !== "/tenants");
  const environmentBadge = environmentBadgeMap[sessionEnvironment];
  const headerContent = getHeaderContent(sessionEnvironment, currentTenant);

  return (
    <aside className="sticky top-4 overflow-hidden rounded-[0.82rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.1),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_46%,#030712_100%)] text-zinc-100 shadow-[0_32px_90px_rgba(15,23,42,0.26)]">
      <div className="border-b border-zinc-100/10 px-5 py-6">
        <span className="font-heading text-[0.68rem] uppercase tracking-[0.34em] text-amber-200/72">
          {headerContent.eyebrow}
        </span>
        <h1 className="mt-3 font-heading text-[1.95rem] uppercase tracking-[-0.08em] text-zinc-50">
          {headerContent.title}
        </h1>
        <p className="mt-3 max-w-[18rem] text-sm leading-6 text-slate-300">
          {headerContent.description}
        </p>
      </div>

      <div className="border-b border-zinc-100/10 px-5 py-5">
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.28em] text-zinc-500">
          Sessao
        </p>
        <div className="mt-4 rounded-[0.74rem] border border-white/10 bg-white/6 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} size="md" className="border-zinc-100" />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm uppercase tracking-[0.18em] text-zinc-100">
                {currentUser.name}
              </p>
              <p className="mt-1 truncate text-sm text-slate-300">{currentUser.email}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-[0.58rem] px-3 py-2 font-heading text-[0.6rem] uppercase tracking-[0.22em] ${environmentBadge.className}`}>
              {environmentBadge.label}
            </span>
            <span className="rounded-[0.58rem] border border-amber-300/30 bg-amber-200/10 px-3 py-2 font-heading text-[0.6rem] uppercase tracking-[0.22em] text-amber-100">
              {currentUser.role}
            </span>
          </div>

          <div className="mt-4 rounded-[0.68rem] border border-white/10 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(255,255,255,0.02))] px-4 py-3.5">
            <p className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-amber-100/80">
              Tenant ativo
            </p>
            <p className="mt-2 font-heading text-sm uppercase tracking-[0.16em] text-amber-50">
              {currentTenant.name}
            </p>
            <p className="mt-1 font-mono text-xs text-amber-100/70">{currentTenant.slug}</p>
            {currentTenant.isSupportContext ? (
              <p className="mt-2 text-xs leading-5 text-amber-100/78">
                Sessao em modo suporte da plataforma.
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-100/10 px-5 py-5">
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.28em] text-zinc-500">
          Busca global
        </p>
        <form action="/tickets" method="GET" className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <span className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-zinc-400">
              Chamado, solicitante ou contato
            </span>
            <input
              type="search"
              name="search"
              placeholder="CH-2048, solicitante, email ou telefone"
              className="crm-dark-field rounded-[0.62rem] px-4 py-3 text-sm outline-none"
            />
          </label>
          <button type="submit" className="crm-btn-primary w-full justify-center text-sm">
            Buscar chamados
          </button>
        </form>
      </div>

      <div className="border-b border-zinc-100/10 px-5 py-5">
        <SidebarNav title="Principal" items={mainNavigation} />
      </div>

      {canAccessAdmin && visibleAdminNavigation.length > 0 ? (
        <div className="px-5 py-5">
          <SidebarNav title="Administracao" items={visibleAdminNavigation} />
        </div>
      ) : null}
    </aside>
  );
}

function getHeaderContent(
  sessionEnvironment: SessionEnvironment,
  currentTenant: AppSidebarProps["currentTenant"],
) {
  if (sessionEnvironment === "platform") {
    return {
      eyebrow: "1400 Graus plataforma",
      title: "Tenants",
      description: "Gerencie empresas, acompanhe o contexto atual da sessao e entre em modo suporte quando precisar atuar em um tenant.",
    };
  }

  if (sessionEnvironment === "support") {
    return {
      eyebrow: `Suporte em ${currentTenant.slug}`,
      title: currentTenant.name,
      description: "Voce esta em atendimento assistido pela plataforma dentro deste tenant, com foco total em operacao de chamados.",
    };
  }

  return {
    eyebrow: currentTenant.slug,
    title: currentTenant.name,
    description: "Central de chamados do tenant atual, com fila, agendamentos e ownership operacional refletidos em tempo real.",
  };
}
