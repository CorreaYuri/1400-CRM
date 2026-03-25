import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTenantInboxOptions, getInboxOptions } from "@/modules/inboxes/server/inbox-service";
import { AddInteractionForm } from "@/modules/tickets/components/add-interaction-form";
import { ChildTicketForm } from "@/modules/tickets/components/child-ticket-form";
import { ChildTicketsModalButton } from "@/modules/tickets/components/child-tickets-modal-button";
import { CloseTicketQuickForm } from "@/modules/tickets/components/close-ticket-quick-form";
import { ScheduleTicketForm } from "@/modules/tickets/components/schedule-ticket-form";
import { TicketActions } from "@/modules/tickets/components/ticket-actions";
import { TransferTicketForm } from "@/modules/tickets/components/transfer-ticket-form";
import { getAssignableUsersForTicket, getTicketById } from "@/modules/tickets/server/ticket-service";
import { getTenantClosureReasons } from "@/modules/tenants/server/tenant-settings-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { UserAvatar } from "@/shared/components/user-avatar";
import { hasRole, requirePageSession } from "@/server/auth/session";

type TicketDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TicketDetailPage({ params, searchParams }: TicketDetailPageProps) {
  const session = await requirePageSession();
  const canTransferAcrossInboxes = hasRole(session, ["ADMIN", "MANAGER"]);
  const { id } = await params;
  const rawSearchParams = (await searchParams) ?? {};
  const timelinePage = readPositiveInt(rawSearchParams.timelinePage);
  const ticket = await getTicketById(id, session.user.id, { timelinePage });

  if (!ticket) {
    notFound();
  }

  const shouldLoadActions = ticket.canOperate;
  const [childInboxes, assignees, inboxes, tenantClosureSettings] = await Promise.all([
    shouldLoadActions ? getAllTenantInboxOptions(session.user.id) : Promise.resolve([]),
    shouldLoadActions ? getAssignableUsersForTicket(id, session.user.id) : Promise.resolve([]),
    shouldLoadActions && canTransferAcrossInboxes ? getInboxOptions(session.user.id) : Promise.resolve([]),
    shouldLoadActions ? getTenantClosureReasons(session.user.tenantId) : Promise.resolve({ closureReasons: [] }),
  ]);

  const canCloseTicket =
    ticket.canOperate &&
    ticket.status === "Em atendimento" &&
    (canTransferAcrossInboxes || ticket.owner?.id === session.user.id);

  return (
    <AppShell>
      <Panel tone="dark">
        <div className="border-b border-white/10 px-4 py-5 sm:px-5 lg:px-6">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr] xl:items-start">
            <div>
              <BackToPanelLink className="mb-3 border-white/10 bg-white/8 text-zinc-100 hover:bg-white/12" />
              <SectionHeader
                eyebrow="Chamado em operacao"
                title={ticket.id}
                tone="dark"
                className="[&_h3]:mt-1 [&_h3]:text-2xl [&_p]:text-[0.58rem] [&_p]:tracking-[0.24em]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-[0.58rem] border border-white/14 bg-white px-2.5 py-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-950">
                  {ticket.status}
                </span>
                <span className="rounded-[0.58rem] border border-white/12 bg-white/6 px-2.5 py-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-200">
                  {ticket.priority}
                </span>
                <span className="rounded-[0.58rem] border border-white/12 bg-white/6 px-2.5 py-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-200">
                  {ticket.origin}
                </span>
                <ChildTicketsModalButton tickets={ticket.childTickets} />
                {ticket.parentTicketId ? (
                  <Link
                    href={`/tickets/${ticket.parentTicketId}`}
                    className="rounded-[0.58rem] border border-white/14 bg-white px-2.5 py-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-white/90"
                  >
                    Voltar para {ticket.parentTicketId}
                  </Link>
                ) : null}
              </div>
              <h1 className="mt-4 max-w-4xl font-heading text-2xl uppercase tracking-[-0.05em] text-zinc-100 sm:text-3xl">
                {ticket.subject}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
                {ticket.description}
              </p>
            </div>

            <div className="grid gap-2.5">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <HeaderInfo label="Solicitante" value={ticket.customer} />
                <HeaderInfo label="Inbox" value={ticket.inbox} />
                <HeaderInfo label="Criado" value={ticket.createdAt} />
                <HeaderOwnerInfo name={ticket.owner?.name ?? "Nao atribuido"} avatarUrl={ticket.owner?.avatarUrl} />
                <HeaderInfo label="Proxima acao" value={ticket.nextAction} />
                <HeaderInfo label="Acordo atual" value={ticket.agreement} />
              </div>

              {ticket.canOperate ? (
                <TicketActions
                  ticketId={ticket.id}
                  status={ticket.status}
                  ownerId={ticket.owner?.id}
                  currentUserId={session.user.id}
                  assignees={assignees}
                  canManageAnyTicket={canTransferAcrossInboxes}
                  closureReasons={tenantClosureSettings.closureReasons}
                  showClose={false}
                  layout="inline"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8 lg:py-6">
          <div className="grid gap-4">
            {ticket.canOperate ? (
              <section className="overflow-hidden rounded-[0.8rem] border border-white/10 bg-white/5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
                <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                  <p className="font-heading text-[0.66rem] uppercase tracking-[0.24em] text-zinc-400">
                    Registro e desdobramentos
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Expanda apenas o que precisa fazer agora: registrar contexto, finalizar, transferir, derivar ou reagendar.
                  </p>
                </div>
                <div className="grid gap-2.5 px-4 py-4 sm:px-5">
                  <ActionPanel title="Observacao ou acordo" defaultOpen>
                    <AddInteractionForm ticketId={ticket.id} variant="quick" />
                  </ActionPanel>

                  {canCloseTicket ? (
                    <ActionPanel title="Finalizar chamado">
                      <CloseTicketQuickForm ticketId={ticket.id} closureReasons={tenantClosureSettings.closureReasons} />
                    </ActionPanel>
                  ) : null}

                  {canTransferAcrossInboxes ? (
                    <ActionPanel title="Transferir para outra inbox">
                      <TransferTicketForm ticketId={ticket.id} currentInboxId={ticket.inboxId} inboxes={inboxes} />
                    </ActionPanel>
                  ) : null}

                  <ActionPanel title="Abrir chamado filho">
                    <ChildTicketForm ticketId={ticket.id} currentInboxId={ticket.inboxId} inboxes={childInboxes} />
                  </ActionPanel>

                  <ActionPanel title="Reagendar atendimento">
                    <ScheduleTicketForm ticketId={ticket.id} />
                  </ActionPanel>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="grid gap-3 self-start lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-[0.8rem] border border-white/10 bg-white/5 shadow-[0_18px_44px_rgba(15,23,42,0.16)]">
              <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
                    Timeline operacional
                  </p>
                  {ticket.timelinePagination ? (
                    <span className="text-[0.62rem] uppercase tracking-[0.18em] text-zinc-500">
                      Pagina {ticket.timelinePagination.page}/{ticket.timelinePagination.totalPages}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Historico cronologico do chamado para consulta lateral durante o atendimento.
                </p>
              </div>

              <div className="crm-scroll max-h-[80vh] overflow-y-auto px-4 py-3 sm:px-5">
                <div className="grid gap-3">
                  {ticket.timeline.map((item, index) => (
                    <div
                      key={`${item.time}-${item.title}-${index}`}
                      className="grid gap-3 rounded-[0.7rem] border border-white/10 bg-white/4 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <UserAvatar name={item.author.name} avatarUrl={item.author.avatarUrl} size="sm" className="border-zinc-100" />
                          <div>
                            <h3 className="font-heading text-sm uppercase tracking-[0.02em] text-zinc-100">
                              {item.title}
                            </h3>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{item.author.name}</p>
                          </div>
                        </div>
                        <span className="inline-flex rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-300">
                          {item.time}
                        </span>
                      </div>
                      {item.isAttachmentOnly ? (
                        <div className="rounded-[0.62rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                          Registro com anexo enviado neste chamado.
                        </div>
                      ) : (
                        <p className="text-sm leading-7 text-zinc-300">{item.description}</p>
                      )}
                      {item.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {item.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              download={attachment.downloadName}
                              target="_blank"
                              rel="noreferrer"
                              title={`Baixar ${attachment.downloadName}`}
                              className="inline-flex items-center gap-2 rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.56rem] uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:bg-white/10"
                            >
                              <span>Baixar</span>
                              <span className="text-zinc-500">|</span>
                              <span>{attachment.name}</span>
                              <span className="text-zinc-500">|</span>
                              <span>{attachment.sizeLabel}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {ticket.timelinePagination ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
                  <p className="text-sm text-zinc-400">
                    Mostrando {ticket.timelinePagination.totalItems > 0 ? ticket.timelinePagination.pageSize * (ticket.timelinePagination.page - 1) + 1 : 0} a {Math.min(ticket.timelinePagination.page * ticket.timelinePagination.pageSize, ticket.timelinePagination.totalItems)} de {ticket.timelinePagination.totalItems} registros.
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={buildTimelineHref(rawSearchParams, ticket.timelinePagination.page - 1)}
                      aria-disabled={!ticket.timelinePagination.hasPreviousPage}
                      className={ticket.timelinePagination.hasPreviousPage ? "crm-btn-secondary text-[0.62rem]" : "crm-btn-secondary pointer-events-none text-[0.62rem] opacity-50"}
                    >
                      Anterior
                    </Link>
                    <Link
                      href={buildTimelineHref(rawSearchParams, ticket.timelinePagination.page + 1)}
                      aria-disabled={!ticket.timelinePagination.hasNextPage}
                      className={ticket.timelinePagination.hasNextPage ? "crm-btn-primary text-[0.62rem]" : "crm-btn-primary pointer-events-none text-[0.62rem] opacity-50"}
                    >
                      Proxima
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </Panel>
    </AppShell>
  );
}

function buildTimelineHref(rawSearchParams: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();

  Object.entries(rawSearchParams).forEach(([key, value]) => {
    if (key === "timelinePage") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) params.append(key, entry);
      });
      return;
    }

    if (value) {
      params.set(key, value);
    }
  });

  if (page > 1) {
    params.set("timelinePage", String(page));
  }

  const query = params.toString();
  return query ? `?${query}` : "#";
}

function readPositiveInt(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function HeaderInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.6rem] border border-white/10 bg-white/6 px-3 py-2.5">
      <p className="font-heading text-[0.5rem] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 text-[0.86rem] leading-5 text-zinc-200">{value}</p>
    </div>
  );
}

function HeaderOwnerInfo({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="border border-white/10 bg-white/6 px-3 py-2.5">
      <p className="font-heading text-[0.5rem] uppercase tracking-[0.18em] text-zinc-500">Responsavel</p>
      <div className="mt-1.5 flex items-center gap-2.5">
        <UserAvatar name={name} avatarUrl={avatarUrl ?? undefined} size="sm" className="border-white/14" />
        <p className="text-[0.86rem] leading-5 text-zinc-200">{name}</p>
      </div>
    </div>
  );
}

function ActionPanel({
  children,
  title,
  id,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  title: string;
  id?: string;
  defaultOpen?: boolean;
}) {
  return (
    <div id={id}>
      <details open={defaultOpen} className="overflow-hidden rounded-[0.66rem] border border-white/10 bg-white/4 open:bg-white/6">
        <summary className="cursor-pointer list-none px-4 py-3 font-heading text-[0.6rem] uppercase tracking-[0.22em] text-zinc-200 marker:content-none">
          {title}
        </summary>
        <div className="border-t border-white/10 p-0">{children}</div>
      </details>
    </div>
  );
}
