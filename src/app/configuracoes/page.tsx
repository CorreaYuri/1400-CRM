import { headers } from "next/headers";
import { AppShell } from "@/shared/components/app-shell";
import { BackToPanelLink } from "@/shared/components/back-to-panel-link";
import { Panel } from "@/shared/components/panel";
import { SectionHeader } from "@/shared/components/section-header";
import { TenantSettingsForm } from "@/modules/tenants/components/tenant-settings-form";
import { PortalLinkCard } from "@/modules/tenants/components/portal-link-card";
import { getTenantSettingsOverview } from "@/modules/tenants/server/tenant-settings-service";
import { env } from "@/server/env";
import { requirePageRole, requirePageSession } from "@/server/auth/session";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPriority(value: string) {
  const labels: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  return labels[value] ?? value;
}

function formatOrigin(value: string) {
  const labels: Record<string, string> = {
    INTERNAL: "Manual por atendente",
    CUSTOMER_PORTAL: "Portal do solicitante",
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    API: "API",
  };

  return labels[value] ?? value;
}

export default async function ConfiguracoesPage() {
  await requirePageRole(["ADMIN", "MANAGER"]);
  const session = await requirePageSession();
  const tenant = await getTenantSettingsOverview(session.user.tenantId);

  if (!tenant) {
    return null;
  }

  const canEditTenant = session.user.role === "ADMIN";
  const portalEnabled = tenant.allowedTicketOrigins.includes("CUSTOMER_PORTAL");
  const emailNotificationsEnabled = Boolean(tenant.notificationSenderEmail);
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const baseUrl = env.APP_URL ?? `${protocol}://${host}`;
  const portalUrl = new URL(`/portal/${tenant.slug}`, baseUrl).toString();

  return (
    <AppShell>
      <Panel>
        <div className="border-b border-slate-950 px-5 py-5">
          <BackToPanelLink className="mb-4" />
          <SectionHeader eyebrow="Administracao" title="Configuracoes" />
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
            Controle o perfil do tenant, acompanhe indicadores basicos da estrutura ativa e ajuste o identificador de acesso da operacao.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="grid gap-5">
            <div className="grid gap-px border border-slate-950 bg-slate-950 md:grid-cols-4">
              <div className="bg-zinc-100 px-4 py-4">
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Tenant</p>
                <strong className="mt-2 block font-heading text-2xl uppercase tracking-[-0.06em] text-slate-950">{tenant.name}</strong>
              </div>
              <div className="bg-zinc-100 px-4 py-4">
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Usuarios ativos</p>
                <strong className="mt-2 block font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">{tenant.activeUsers}</strong>
              </div>
              <div className="bg-zinc-100 px-4 py-4">
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inboxes ativas</p>
                <strong className="mt-2 block font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">{tenant.activeInboxes}</strong>
              </div>
              <div className="bg-zinc-100 px-4 py-4">
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Chamados abertos</p>
                <strong className="mt-2 block font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">{tenant.openTickets}</strong>
              </div>
            </div>

            <TenantSettingsForm
              initialName={tenant.name}
              initialSlug={tenant.slug}
              initialLogoUrl={tenant.logoUrl}
              initialNotificationSenderName={tenant.notificationSenderName}
              initialNotificationSenderEmail={tenant.notificationSenderEmail}
              initialDefaultTicketPriority={tenant.defaultTicketPriority}
              initialAllowedTicketOrigins={tenant.allowedTicketOrigins}
              initialClosureReasons={tenant.closureReasons}
              canEdit={canEditTenant}
            />
          </div>

          <aside className="grid gap-4 self-start">
            <div className="border border-slate-950 bg-slate-950 px-5 py-5 text-zinc-100">
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">Resumo tecnico</p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-300">
                <p>
                  <strong className="font-heading text-zinc-100">Slug atual:</strong> {tenant.slug}
                </p>
                <p>
                  <strong className="font-heading text-zinc-100">Prioridade padrao:</strong> {formatPriority(tenant.defaultTicketPriority)}
                </p>
                <p>
                  <strong className="font-heading text-zinc-100">Criado em:</strong> {formatDate(tenant.createdAt)}
                </p>
                <p>
                  <strong className="font-heading text-zinc-100">Ultima atualizacao:</strong> {formatDate(tenant.updatedAt)}
                </p>
              </div>
            </div>

            <PortalLinkCard portalUrl={portalUrl} isEnabled={portalEnabled} />

            <div className="border border-slate-950 bg-white/70 px-5 py-5">
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">Notificacoes por e-mail</p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                <p><strong>Status:</strong> {emailNotificationsEnabled ? "Configurado para disparo automatico" : "Sem remetente configurado"}</p>
                <p><strong>Remetente:</strong> {tenant.notificationSenderName ?? tenant.name} {tenant.notificationSenderEmail ? `(${tenant.notificationSenderEmail})` : ""}</p>
                <p>Quando configurado, o sistema envia atualizacoes do chamado para os usuarios envolvidos no atendimento.</p>
              </div>
            </div>

            <div className="border border-slate-950 bg-white/70 px-5 py-5">
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">Regras operacionais</p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                <p><strong>Origens habilitadas:</strong> {tenant.allowedTicketOrigins.map((origin) => formatOrigin(origin)).join(", ")}</p>
                <p><strong>Motivos de encerramento:</strong> {tenant.closureReasons.length > 0 ? tenant.closureReasons.join(", ") : "Nenhum catalogado"}</p>
                <p>Essas regras ficam ativas no fluxo de abertura e encerramento de chamados do tenant.</p>
              </div>
            </div>
          </aside>
        </div>
      </Panel>
    </AppShell>
  );
}
