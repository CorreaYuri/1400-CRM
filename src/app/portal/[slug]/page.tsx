import Image from "next/image";
import { notFound } from "next/navigation";
import { TicketOrigin } from "@prisma/client";
import { PortalTicketForm } from "@/modules/tickets/components/portal-ticket-form";
import { db } from "@/server/db";

type PortalPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PortalPage({ params }: PortalPageProps) {
  const { slug } = await params;
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      allowedTicketOrigins: true,
      inboxes: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  const portalEnabled = (tenant.allowedTicketOrigins.length ? tenant.allowedTicketOrigins : [TicketOrigin.CUSTOMER_PORTAL]).includes(TicketOrigin.CUSTOMER_PORTAL);
  const hasInboxes = tenant.inboxes.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-[0.82rem] border border-slate-900/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88))] shadow-[0_24px_56px_rgba(148,163,184,0.16)]">
          <div className="border-b border-slate-900/10 px-5 py-6 sm:px-6">
            {tenant.logoUrl ? (
              <div className="mb-5 flex">
                <Image src={tenant.logoUrl} alt={tenant.name} width={180} height={56} className="h-14 w-auto object-contain" unoptimized />
              </div>
            ) : null}
            <p className="font-heading text-[0.62rem] uppercase tracking-[0.28em] text-slate-500">
              Portal do solicitante
            </p>
            <h1 className="mt-3 font-heading text-3xl uppercase tracking-[-0.07em] text-slate-950 sm:text-4xl">
              {tenant.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Use este formulario para registrar um chamado diretamente com a equipe responsavel. O atendimento sera encaminhado para a fila do setor escolhido.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {!portalEnabled ? (
              <div className="rounded-[0.72rem] border border-amber-300 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
                Este tenant nao esta com abertura publica de chamados habilitada no momento.
              </div>
            ) : !hasInboxes ? (
              <div className="rounded-[0.72rem] border border-slate-900/10 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                Nenhum setor esta disponivel para receber chamados agora. Tente novamente mais tarde.
              </div>
            ) : (
              <PortalTicketForm tenantSlug={tenant.slug} tenantName={tenant.name} inboxes={tenant.inboxes} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
