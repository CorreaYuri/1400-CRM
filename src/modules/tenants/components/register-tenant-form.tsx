"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ExtraUserFormState = {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "AGENT";
  inboxCodes: string[];
};

type RegisterTenantFormState = {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  password: string;
  inboxCodes: string[];
  extraUsers: ExtraUserFormState[];
};

type InboxTemplate = {
  code: string;
  name: string;
  description: string;
};

type RegisterTenantFormProps = {
  preservePlatformSession?: boolean;
};

const AVAILABLE_INBOXES: InboxTemplate[] = [
  {
    name: "Suporte",
    code: "SUP",
    description: "Atendimento inicial e operacao corrente.",
  },
  {
    name: "Backoffice",
    code: "BKO",
    description: "Tratativas internas, documentos e apoio operacional.",
  },
  {
    name: "Triagem Tecnica",
    code: "TRI",
    description: "Qualificacao tecnica antes de seguir para outras areas.",
  },
  {
    name: "Infra",
    code: "INF",
    description: "Chamados internos de acesso, ambiente e infraestrutura.",
  },
  {
    name: "RH",
    code: "RH",
    description: "Demandas internas de pessoas, beneficios e politicas.",
  },
  {
    name: "Financeiro",
    code: "FIN",
    description: "Tratativas financeiras, cobrancas e validacoes administrativas.",
  },
  {
    name: "Cobranca",
    code: "COB",
    description: "Recuperacao, follow-up e negociacao de pendencias financeiras.",
  },
];

const DEFAULT_SELECTED_INBOXES = ["SUP", "BKO", "TRI", "INF", "RH", "FIN", "COB"];

export function RegisterTenantForm({ preservePlatformSession = false }: RegisterTenantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RegisterTenantFormState>({
    tenantName: "",
    tenantSlug: "",
    adminName: "",
    adminEmail: "",
    password: "",
    inboxCodes: DEFAULT_SELECTED_INBOXES,
    extraUsers: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [logoFile]);

  const suggestedSlug = useMemo(() => {
    if (!form.tenantName.trim()) {
      return "";
    }

    return form.tenantName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }, [form.tenantName]);

  const selectedInboxes = useMemo(
    () => AVAILABLE_INBOXES.filter((inbox) => form.inboxCodes.includes(inbox.code)),
    [form.inboxCodes],
  );

  function updateField<K extends keyof RegisterTenantFormState>(field: K, value: RegisterTenantFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateExtraUser<K extends keyof ExtraUserFormState>(index: number, field: K, value: ExtraUserFormState[K]) {
    setForm((current) => ({
      ...current,
      extraUsers: current.extraUsers.map((user, userIndex) =>
        userIndex === index ? { ...user, [field]: value } : user,
      ),
    }));
  }

  function addExtraUser() {
    setForm((current) => ({
      ...current,
      extraUsers: [
        ...current.extraUsers,
        {
          name: "",
          email: "",
          password: "",
          role: "AGENT",
          inboxCodes: current.inboxCodes.length > 0 ? [current.inboxCodes[0]] : [],
        },
      ],
    }));
  }

  function removeExtraUser(index: number) {
    setForm((current) => ({
      ...current,
      extraUsers: current.extraUsers.filter((_, userIndex) => userIndex !== index),
    }));
  }

  function toggleInbox(code: string) {
    setForm((current) => {
      const inboxIsSelected = current.inboxCodes.includes(code);
      const nextInboxCodes = inboxIsSelected
        ? current.inboxCodes.filter((item) => item !== code)
        : [...current.inboxCodes, code];

      return {
        ...current,
        inboxCodes: nextInboxCodes,
        extraUsers: current.extraUsers.map((user) => ({
          ...user,
          inboxCodes: user.inboxCodes.filter((inboxCode) => nextInboxCodes.includes(inboxCode)),
        })),
      };
    });
  }

  function toggleExtraUserInbox(userIndex: number, inboxCode: string) {
    setForm((current) => ({
      ...current,
      extraUsers: current.extraUsers.map((user, index) => {
        if (index !== userIndex) {
          return user;
        }

        return {
          ...user,
          inboxCodes: user.inboxCodes.includes(inboxCode)
            ? user.inboxCodes.filter((code) => code !== inboxCode)
            : [...user.inboxCodes, inboxCode],
        };
      }),
    }));
  }

  function applySuggestedSlug() {
    if (!suggestedSlug) {
      return;
    }

    updateField("tenantSlug", suggestedSlug);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const body = new FormData();
      body.set("tenantName", form.tenantName);
      body.set("tenantSlug", form.tenantSlug);
      body.set("adminName", form.adminName);
      body.set("adminEmail", form.adminEmail);
      body.set("password", form.password);
      body.set("inboxCodes", JSON.stringify(form.inboxCodes));
      body.set("extraUsers", JSON.stringify(form.extraUsers));
      body.set("preservePlatformSession", String(preservePlatformSession));

      if (logoFile) {
        body.set("logoFile", logoFile);
      }

      const response = await fetch("/api/tenants/register", {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel criar o tenant.");
        return;
      }

      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Tenant criado com sucesso.");
      router.push(preservePlatformSession ? "/tenants" : "/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 border border-slate-950 bg-zinc-100 px-5 py-5">
      <div>
        <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">Onboarding</p>
        <h1 className="mt-3 font-heading text-4xl uppercase tracking-[-0.08em] text-slate-950">Criar tenant</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Cadastre sua empresa, defina o identificador do tenant e escolha a estrutura inicial para entrar operando com o administrador principal.
        </p>
        {preservePlatformSession ? (
          <p className="mt-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            Voce esta criando este tenant pela area da plataforma. Sua sessao atual sera preservada ao final.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 md:col-span-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Empresa</span>
          <input
            value={form.tenantName}
            onChange={(event) => updateField("tenantName", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Logo do portal</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none file:mr-4 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-heading file:text-[0.62rem] file:uppercase file:tracking-[0.18em] file:text-zinc-100"
          />
          <p className="text-xs text-slate-700">Opcional. Envie uma imagem JPG, PNG, WEBP ou SVG para exibir a logo no portal do solicitante.</p>
          {logoPreviewUrl ? (
            <div className="mt-2 border border-slate-950 bg-white px-4 py-4">
              <Image src={logoPreviewUrl} alt="Preview da logo" width={180} height={56} className="h-14 w-auto object-contain" unoptimized />
            </div>
          ) : null}
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Slug do tenant</span>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={form.tenantSlug}
              onChange={(event) => updateField("tenantSlug", event.target.value)}
              placeholder="ex.: minha-operacao"
              className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
            />
            <button
              type="button"
              onClick={applySuggestedSlug}
              className="border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950"
            >
              Sugerir
            </button>
          </div>
          {suggestedSlug ? <p className="text-xs text-slate-700">Sugestao: {suggestedSlug}</p> : null}
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Administrador</span>
          <input value={form.adminName} onChange={(event) => updateField("adminName", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Email do admin</span>
          <input type="email" value={form.adminEmail} onChange={(event) => updateField("adminEmail", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Senha do administrador</span>
        <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
        <p className="text-xs text-slate-700">Essa senha vale apenas para o usuario administrador criado no tenant.</p>
      </label>

      <div className="grid gap-3 border border-slate-950 p-4">
        <div>
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inboxes iniciais</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Escolha as filas que ja devem nascer ativas no tenant. Inclui `RH`, `Financeiro` e `Cobranca` para cobrir operacoes internas comuns.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AVAILABLE_INBOXES.map((inbox) => {
            const checked = form.inboxCodes.includes(inbox.code);

            return (
              <label key={inbox.code} className={`grid gap-2 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"}`}>
                <span className="flex items-center gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggleInbox(inbox.code)} className="h-4 w-4 border-slate-950" />
                  <strong>{inbox.name}</strong>
                </span>
                <span>{inbox.code}</span>
                <span>{inbox.description}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 border border-slate-950 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Usuarios extras</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Cadastre usuarios adicionais ja no onboarding, defina a senha de cada um e escolha em quais inboxes iniciais eles vao atuar.
            </p>
          </div>
          <button type="button" onClick={addExtraUser} className="border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950">
            Adicionar usuario
          </button>
        </div>

        {form.extraUsers.length === 0 ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-700">Nenhum usuario extra configurado nesta primeira etapa.</div> : null}

        {form.extraUsers.map((user, index) => (
          <div key={index} className="grid gap-4 border border-slate-950 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nome</span>
                <input value={user.name} onChange={(event) => updateExtraUser(index, "name", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
              </label>

              <label className="grid gap-2">
                <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Email</span>
                <input type="email" value={user.email} onChange={(event) => updateExtraUser(index, "email", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
              </label>

              <label className="grid gap-2">
                <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Senha inicial</span>
                <input type="password" value={user.password} onChange={(event) => updateExtraUser(index, "password", event.target.value)} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none" />
              </label>

              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end xl:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2">
                  <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Papel</span>
                  <select value={user.role} onChange={(event) => updateExtraUser(index, "role", event.target.value as ExtraUserFormState["role"])} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none">
                    <option value="MANAGER">MANAGER</option>
                    <option value="AGENT">AGENT</option>
                  </select>
                </label>
                <button type="button" onClick={() => removeExtraUser(index)} className="border border-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950">
                  Remover
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inboxes do usuario</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Cada usuario extra precisa entrar em pelo menos uma inbox entre as selecionadas para o tenant. Se precisar trocar a senha depois, use o reset na tela de usuarios.
                </p>
              </div>

              {selectedInboxes.length === 0 ? (
                <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-700">Selecione ao menos uma inbox inicial no tenant para distribuir esse usuario.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedInboxes.map((inbox) => {
                    const checked = user.inboxCodes.includes(inbox.code);

                    return (
                      <label key={`${index}-${inbox.code}`} className={`grid gap-2 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"}`}>
                        <span className="flex items-center gap-3">
                          <input type="checkbox" checked={checked} onChange={() => toggleExtraUserInbox(index, inbox.code)} className="h-4 w-4 border-slate-950" />
                          <strong>{inbox.name}</strong>
                        </span>
                        <span>{inbox.code}</span>
                        <span>{inbox.description}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {message ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{message}</div> : null}
      {error ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{error}</div> : null}

      <button type="submit" disabled={isPending} className="border border-slate-950 bg-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50">
        {isPending ? "Criando..." : preservePlatformSession ? "Criar tenant" : "Criar tenant e entrar"}
      </button>

      <div className="border-t border-slate-950 pt-4 text-sm leading-6 text-slate-700">
        Ja possui um tenant? <Link href="/login" className="font-heading uppercase tracking-[0.18em] text-slate-950">Entrar</Link>
      </div>
    </form>
  );
}


