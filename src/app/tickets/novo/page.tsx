import Link from "next/link";
import { getInboxOptions } from "@/modules/inboxes/server/inbox-service";
import { CreateTicketForm } from "@/modules/tickets/components/create-ticket-form";
import { getTenantTicketCreationSettings } from "@/modules/tenants/server/tenant-settings-service";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { requirePageSession } from "@/server/auth/session";

export default async function NewTicketPage() {
  const session = await requirePageSession();
  const [inboxes, ticketSettings] = await Promise.all([
    getInboxOptions(session.user.id),
    getTenantTicketCreationSettings(session.user.tenantId),
  ]);

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <BackToPanelLink className="mb-4" />
              <SectionHeader eyebrow="Fluxo" title="Novo chamado" />
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
                Primeiro formulario funcional do produto para abertura manual de chamados.
              </p>
            </div>
            <Link
              href="/tickets"
              className="border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950"
            >
              Voltar para chamados
            </Link>
          </div>
        </div>

        <CreateTicketForm
          inboxes={inboxes}
          defaultPriority={ticketSettings.defaultPriority}
          allowedOrigins={ticketSettings.allowedOrigins}
        />
      </Panel>
    </AppShell>
  );
}
