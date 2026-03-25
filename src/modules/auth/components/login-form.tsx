"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  initialTenantSlug?: string;
  initialEmail?: string;
};

export function LoginForm({ initialTenantSlug = "demo-1400", initialEmail = "admin@1400.demo" }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tenantSlug, setTenantSlug] = useState(initialTenantSlug);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("1400demo");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenantSlug, email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel entrar.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="crm-surface-card grid w-full gap-5 border border-slate-950/12 px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
      <div className="grid gap-4 border-b border-slate-950/10 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-heading text-[0.58rem] uppercase tracking-[0.28em] text-zinc-500">
              Acesso ao sistema
            </p>
            <h2 className="mt-2 font-heading text-3xl uppercase tracking-[-0.08em] text-slate-950">
              Entrar no tenant
            </h2>
          </div>
          <div className="border border-amber-300/70 bg-amber-100/80 px-3 py-2 font-heading text-[0.54rem] uppercase tracking-[0.22em] text-amber-950">
            1400º CRM
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-700">
          Use uma conta ativa para acessar a operacao, assumir chamados e registrar a autoria das movimentacoes.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-500">
            Tenant
          </span>
          <input
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
            className="w-full border border-slate-950/14 bg-white/88 px-4 py-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500"
            placeholder="Ex: demo-1400"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-500">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border border-slate-950/14 bg-white/88 px-4 py-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500"
            placeholder="voce@empresa.com"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-500">
            Senha
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-slate-950/14 bg-white/88 px-4 py-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500"
          />
        </label>
      </div>

      {error ? (
        <div className="border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="crm-btn-primary w-full disabled:opacity-50"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      <div className="grid gap-3 border-t border-slate-950/10 pt-5 text-sm leading-6 text-slate-700">
        <div className="border border-slate-950/10 bg-white/74 px-4 py-3">
          <p className="font-heading text-[0.56rem] uppercase tracking-[0.22em] text-zinc-500">
            Ambiente demo
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Tenant `demo-1400`, admin `admin@1400.demo`, gerente `gerente@1400.demo`, agentes `camila@1400.demo` e `rafael@1400.demo`, todos com senha `1400demo`.
          </p>
        </div>

        <p>
          Ainda nao tem tenant? <Link href="/cadastro" className="font-heading uppercase tracking-[0.18em] text-slate-950">Criar agora</Link>
        </p>
      </div>
    </form>
  );
}
