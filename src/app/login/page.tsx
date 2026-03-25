import { redirect } from "next/navigation";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getSession } from "@/server/auth/session";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (session) {
    redirect("/");
  }

  const tenantSlug =
    typeof resolvedSearchParams?.tenantSlug === "string" ? resolvedSearchParams.tenantSlug : undefined;
  const email = typeof resolvedSearchParams?.email === "string" ? resolvedSearchParams.email : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-3rem)] items-stretch gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden border border-slate-950/12 bg-[linear-gradient(160deg,rgba(15,23,42,0.96),rgba(30,41,59,0.9))] px-6 py-7 text-zinc-100 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="grid gap-8">
              <div>
                <p className="font-heading text-[0.74rem] uppercase tracking-[0.42em] text-amber-300">
                  1400º CRM
                </p>
                <h1 className="mt-5 max-w-xl font-heading text-4xl uppercase tracking-[-0.08em] text-white sm:text-5xl lg:text-[3.35rem]">
                  Central de chamados com operacao clara.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Entre no tenant certo, assuma ownership da fila e acompanhe cada movimentacao com contexto, auditoria e ritmo operacional.
                </p>
              </div>

              <div className="grid gap-px border border-white/12 bg-white/12 sm:grid-cols-3">
                <MetricCard label="Foco" value="Atendimento" />
                <MetricCard label="Modelo" value="Multi-tenant" />
                <MetricCard label="Fluxo" value="Inbox por setor" />
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/12 pt-6 text-sm leading-6 text-slate-300">
              <p>
                Acesso seguro por tenant, ownership por agente e trilha completa para suporte e operacao do dia a dia.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="border border-white/12 bg-white/8 px-3 py-2 font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-200">
                  Timeline operacional
                </span>
                <span className="border border-white/12 bg-white/8 px-3 py-2 font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-200">
                  Busca global
                </span>
                <span className="border border-white/12 bg-white/8 px-3 py-2 font-heading text-[0.58rem] uppercase tracking-[0.22em] text-slate-200">
                  Suporte da plataforma
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <LoginForm initialTenantSlug={tenantSlug} initialEmail={email} />
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/6 px-4 py-4 backdrop-blur-sm">
      <p className="font-heading text-[0.52rem] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 font-heading text-lg uppercase tracking-[-0.05em] text-white">{value}</p>
    </div>
  );
}
