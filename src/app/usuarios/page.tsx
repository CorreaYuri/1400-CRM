import { CreateUserForm } from "@/modules/users/components/create-user-form";
import { UserInboxMembershipManager } from "@/modules/users/components/user-inbox-membership-manager";
import { getUsersWithInboxMemberships } from "@/modules/users/server/user-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { requirePageRole, requirePageSession } from "@/server/auth/session";

type UsuariosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  await requirePageRole(["ADMIN", "MANAGER"]);
  const session = await requirePageSession();
  const rawSearchParams = (await searchParams) ?? {};
  const { users, inboxes } = await getUsersWithInboxMemberships(session.user.tenantId);
  const activeMemberships = users.reduce((total: number, user: (typeof users)[number]) => total + user.inboxIds.length, 0);
  const activeUsers = users.filter((user: (typeof users)[number]) => user.isActive).length;
  const usersWithoutInbox = users.filter((user: (typeof users)[number]) => user.inboxIds.length === 0).length;

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-900/10 px-5 py-5">
          <BackToPanelLink className="mb-4" />
          <SectionHeader eyebrow="Administracao" title="Usuarios" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Controle de usuarios, papeis e vinculacao a uma ou varias inboxes para definir onde cada pessoa pode atuar.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-5">
            <MetricCard label="Usuarios" value={String(users.length)} />
            <MetricCard label="Ativos" value={String(activeUsers)} />
            <MetricCard label="Inboxes" value={String(inboxes.length)} />
            <MetricCard label="Vinculos ativos" value={String(activeMemberships)} />
            <MetricCard label="Sem inbox" value={String(usersWithoutInbox)} />
          </div>

          <div className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <CreateUserForm inboxes={inboxes} currentUserRole={session.user.role} />
          </div>

          <div className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <UserInboxMembershipManager
              users={users}
              inboxes={inboxes}
              currentUserRole={session.user.role}
              currentUserId={session.user.id}
              initialCoverageFilter={readSingleSearchParam(rawSearchParams.coverageFilter)}
            />
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.72rem] border border-slate-900/8 bg-white/76 px-4 py-4 shadow-[0_14px_32px_rgba(148,163,184,0.12)]">
      <p className="font-heading text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <strong className="mt-2 block font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">{value}</strong>
    </div>
  );
}

function readSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
