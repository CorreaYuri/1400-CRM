import { CreateInboxForm } from "@/modules/inboxes/components/create-inbox-form";
import { InboxManager } from "@/modules/inboxes/components/inbox-manager";
import { getInboxManagementData } from "@/modules/inboxes/server/inbox-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { requirePageRole, requirePageSession } from "@/server/auth/session";

type InboxesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InboxesPage({ searchParams }: InboxesPageProps) {
  await requirePageRole(["ADMIN", "MANAGER"]);
  const session = await requirePageSession();
  const rawSearchParams = (await searchParams) ?? {};
  const { inboxes, users } = await getInboxManagementData(session.user.tenantId);
  const activeInboxes = inboxes.filter((inbox: (typeof inboxes)[number]) => inbox.isActive).length;
  const totalQueue = inboxes.reduce((total: number, inbox: (typeof inboxes)[number]) => total + inbox.queueCount, 0);
  const totalMemberships = inboxes.reduce((total: number, inbox: (typeof inboxes)[number]) => total + inbox.membershipCount, 0);
  const inboxesWithoutTeam = inboxes.filter((inbox: (typeof inboxes)[number]) => inbox.membershipCount === 0).length;

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-900/10 px-5 py-5">
          <BackToPanelLink href="/" label="Voltar para hoje" className="mb-4" />
          <SectionHeader eyebrow="Administracao" title="Inboxes" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Gerencie filas do tenant, acompanhe volume aberto e mantenha o catalogo de setores ativo para a operacao.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-5">
            <MetricCard label="Inboxes" value={String(inboxes.length)} />
            <MetricCard label="Ativas" value={String(activeInboxes)} />
            <MetricCard label="Fila aberta" value={String(totalQueue)} />
            <MetricCard label="Vinculos" value={String(totalMemberships)} />
            <MetricCard label="Sem equipe" value={String(inboxesWithoutTeam)} />
          </div>

          <div className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <CreateInboxForm />
          </div>

          <div className="overflow-hidden rounded-[0.8rem] border border-slate-900/8 bg-white/72 shadow-[0_18px_44px_rgba(148,163,184,0.14)]">
            <InboxManager
              inboxes={inboxes}
              users={users}
              initialTeamCoverageFilter={readSingleSearchParam(rawSearchParams.teamCoverageFilter)}
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
