import type { ReactNode } from "react";
import { ScheduleStatus, TicketStatus } from "@prisma/client";
import { AppSidebar } from "@/modules/dashboard/components/app-sidebar";
import { ExitSupportModeButton } from "@/modules/tenants/components/exit-support-mode-button";
import { appSidebarAdminNavigation } from "@/modules/dashboard/navigation";
import { isPlatformAdminSession } from "@/server/auth/platform-access";
import { requirePageSession } from "@/server/auth/session";
import { db } from "@/server/db";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const session = await requirePageSession();
  const isPlatformAdmin = isPlatformAdminSession(session);
  const activeTenantId = session.support?.targetTenant.id ?? session.user.tenantId;
  const sessionEnvironment = session.support ? "support" : isPlatformAdmin ? "platform" : "tenant";

  const currentTenantPromise = session.support
    ? Promise.resolve({
        id: session.support.targetTenant.id,
        name: session.support.targetTenant.name,
        slug: session.support.targetTenant.slug,
      })
    : db.tenant.findUnique({
        where: { id: activeTenantId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

  const [currentTenant, openTicketCount, pendingScheduleCount, inboxCount] = await Promise.all([
    currentTenantPromise,
    db.ticket.count({
      where: {
        tenantId: activeTenantId,
        status: {
          notIn: [TicketStatus.CLOSED, TicketStatus.CANCELED],
        },
      },
    }),
    db.ticketSchedule.count({
      where: {
        status: ScheduleStatus.PENDING,
        ticket: {
          tenantId: activeTenantId,
          status: {
            notIn: [TicketStatus.CLOSED, TicketStatus.CANCELED],
          },
        },
      },
    }),
    session.support || isPlatformAdmin
      ? db.inbox.count({
          where: {
            tenantId: activeTenantId,
            isActive: true,
          },
        })
      : db.inboxMembership.count({
          where: {
            userId: session.user.id,
            inbox: {
              tenantId: activeTenantId,
              isActive: true,
            },
          },
        }),
  ]);

  const resolvedTenant = {
    id: currentTenant?.id ?? activeTenantId,
    name: currentTenant?.name ?? "Tenant atual",
    slug: currentTenant?.slug ?? activeTenantId,
    isSupportContext: Boolean(session.support),
  };

  const mainNavigation = [
    { label: "Painel", href: "/dashboard" },
    { label: "Hoje", href: "/" },
    { label: "Chamados", href: "/tickets", count: formatCount(openTicketCount) },
    { label: "Inboxes", href: "/inboxes", count: formatCount(inboxCount) },
    { label: "Agendamentos", href: "/agendamentos", count: formatCount(pendingScheduleCount) },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1680px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-2rem)] items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:gap-6">
        <AppSidebar
          mainNavigation={mainNavigation}
          adminNavigation={appSidebarAdminNavigation}
          showTenantManagement={isPlatformAdmin}
          sessionEnvironment={sessionEnvironment}
          currentTenant={resolvedTenant}
          currentUser={{ ...session.user, avatarUrl: session.user.avatarUrl ?? null }}
        />
        <section className="grid gap-5 xl:gap-6">
          {session.support ? (
            <div className="overflow-hidden rounded-[0.78rem] border border-amber-300/50 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(255,251,235,0.92))] px-5 py-4 shadow-[0_16px_40px_rgba(217,119,6,0.14)] sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-heading text-[0.64rem] uppercase tracking-[0.28em] text-amber-900">
                    Modo suporte da plataforma
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-950 sm:text-base">
                    Voce esta operando o tenant {session.support.targetTenant.name} ({session.support.targetTenant.slug}) com a sua conta interna.
                  </p>
                </div>
                <ExitSupportModeButton />
              </div>
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

function formatCount(value: number) {
  return value.toString().padStart(2, "0");
}
