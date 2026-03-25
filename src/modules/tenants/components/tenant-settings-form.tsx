"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketOrigin, TicketPriority } from "@prisma/client";
import { FormFeedback } from "@/shared/components/form-feedback";

type TenantSettingsFormProps = {
  initialName: string;
  initialSlug: string;
  initialLogoUrl: string | null;
  initialNotificationSenderName: string | null;
  initialNotificationSenderEmail: string | null;
  initialDefaultTicketPriority: TicketPriority;
  initialAllowedTicketOrigins: TicketOrigin[];
  initialClosureReasons: string[];
  canEdit: boolean;
};

const ORIGIN_OPTIONS: Array<{ value: TicketOrigin; label: string }> = [
  { value: "INTERNAL", label: "Manual por atendente" },
  { value: "CUSTOMER_PORTAL", label: "Portal do solicitante" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "API", label: "API" },
];

export function TenantSettingsForm({
  initialName,
  initialSlug,
  initialLogoUrl,
  initialNotificationSenderName,
  initialNotificationSenderEmail,
  initialDefaultTicketPriority,
  initialAllowedTicketOrigins,
  initialClosureReasons,
  canEdit,
}: TenantSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initialLogoUrl ?? null);
  const [notificationSenderName, setNotificationSenderName] = useState(initialNotificationSenderName ?? "");
  const [notificationSenderEmail, setNotificationSenderEmail] = useState(initialNotificationSenderEmail ?? "");
  const [defaultTicketPriority, setDefaultTicketPriority] = useState<TicketPriority>(initialDefaultTicketPriority);
  const [allowedTicketOrigins, setAllowedTicketOrigins] = useState<TicketOrigin[]>(initialAllowedTicketOrigins);
  const [closureReasonsText, setClosureReasonsText] = useState(initialClosureReasons.join("\n"));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(removeLogo ? null : initialLogoUrl ?? null);
      return;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [initialLogoUrl, logoFile, removeLogo]);

  function toggleOrigin(origin: TicketOrigin) {
    setAllowedTicketOrigins((current) =>
      current.includes(origin) ? current.filter((item) => item !== origin) : [...current, origin],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const body = new FormData();
      body.set("name", name);
      body.set("slug", slug);
      body.set("notificationSenderName", notificationSenderName);
      body.set("notificationSenderEmail", notificationSenderEmail);
      body.set("defaultTicketPriority", defaultTicketPriority);
      body.set("allowedTicketOrigins", JSON.stringify(allowedTicketOrigins));
      body.set(
        "closureReasons",
        JSON.stringify(
          closureReasonsText
            .split("\n")
            .map((reason) => reason.trim())
            .filter(Boolean),
        ),
      );
      body.set("removeLogo", String(removeLogo && !logoFile));

      if (logoFile) {
        body.set("logoFile", logoFile);
      }

      const response = await fetch("/api/tenants/current", {
        method: "PATCH",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar o tenant.");
        return;
      }

      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Tenant atualizado com sucesso.");
      setLogoFile(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 border border-slate-950 bg-white/70 px-5 py-5">
      <div>
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Perfil e regras do tenant</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Ajuste a identidade visual, o remetente das notificacoes e as preferencias operacionais usadas na abertura e na movimentacao dos chamados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nome do tenant</span>
          <input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit || isPending} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Slug de acesso</span>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!canEdit || isPending} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
        </label>
      </div>

      <div className="grid gap-3 border border-slate-950 bg-zinc-100 px-4 py-4">
        <div>
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Logo do portal</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Envie um arquivo de imagem para representar o tenant no portal do solicitante e nos comunicados visuais.</p>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => {
            setLogoFile(event.target.files?.[0] ?? null);
            setRemoveLogo(false);
          }}
          disabled={!canEdit || isPending}
          className="w-full border border-slate-950 bg-white px-4 py-3 text-sm text-slate-950 outline-none file:mr-4 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-heading file:text-[0.62rem] file:uppercase file:tracking-[0.18em] file:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        />

        {logoPreviewUrl ? (
          <div className="border border-slate-950 bg-white px-4 py-4">
            <Image src={logoPreviewUrl} alt="Preview da logo do tenant" width={180} height={56} className="h-14 w-auto object-contain" unoptimized />
          </div>
        ) : (
          <div className="border border-dashed border-slate-950/30 bg-white px-4 py-4 text-sm text-slate-600">Nenhuma logo configurada no momento.</div>
        )}

        <label className="inline-flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={removeLogo}
            onChange={(event) => {
              setRemoveLogo(event.target.checked);
              if (event.target.checked) {
                setLogoFile(null);
              }
            }}
            disabled={!canEdit || isPending || (!initialLogoUrl && !logoPreviewUrl)}
            className="h-4 w-4 border-slate-950"
          />
          Remover logo atual
        </label>
      </div>

      <div className="grid gap-4 border border-slate-950 bg-zinc-100 px-4 py-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Disparo automatico por e-mail</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Defina o remetente usado para avisar os usuarios envolvidos quando o chamado receber movimentacoes como assuncao, comentario, reagendamento, transferencia e fechamento.
          </p>
        </div>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nome do remetente</span>
          <input value={notificationSenderName} onChange={(event) => setNotificationSenderName(event.target.value)} disabled={!canEdit || isPending} placeholder="Ex.: Central de chamados" className="w-full border border-slate-950 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">E-mail remetente</span>
          <input type="email" value={notificationSenderEmail} onChange={(event) => setNotificationSenderEmail(event.target.value)} disabled={!canEdit || isPending} placeholder="chamados@suaempresa.com" className="w-full border border-slate-950 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Prioridade padrao</span>
        <select value={defaultTicketPriority} onChange={(event) => setDefaultTicketPriority(event.target.value as TicketPriority)} disabled={!canEdit || isPending} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60">
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </select>
      </label>

      <div className="grid gap-3 border border-slate-950 bg-zinc-100 px-4 py-4">
        <div>
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Origens habilitadas</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Defina de quais canais novos chamados podem nascer neste tenant.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ORIGIN_OPTIONS.map((origin) => {
            const checked = allowedTicketOrigins.includes(origin.value);

            return (
              <label key={origin.value} className={`grid gap-2 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"}`}>
                <span className="flex items-center gap-3">
                  <input type="checkbox" checked={checked} onChange={() => toggleOrigin(origin.value)} disabled={!canEdit || isPending} className="h-4 w-4 border-slate-950" />
                  <strong>{origin.label}</strong>
                </span>
                <span>{origin.value}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Motivos de encerramento</span>
        <textarea value={closureReasonsText} onChange={(event) => setClosureReasonsText(event.target.value)} rows={5} disabled={!canEdit || isPending} className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm leading-6 text-slate-950 outline-none disabled:cursor-not-allowed disabled:opacity-60" placeholder={"Um motivo por linha\nResolvido\nSolicitacao atendida\nSem retorno do solicitante"} />
        <p className="text-xs text-slate-700">Esses motivos ficam catalogados no tenant para evoluir o fechamento operacional.</p>
      </label>

      {!canEdit ? <FormFeedback tone="info" message="Seu perfil pode consultar as configuracoes do tenant, mas apenas administradores podem altera-las." /> : null}
      {message ? <FormFeedback tone="success" message={message} /> : null}
      {error ? <FormFeedback tone="error" message={error} /> : null}

      <button type="submit" disabled={!canEdit || isPending} className="border border-slate-950 bg-slate-950 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">
        {isPending ? "Salvando..." : "Salvar configuracoes"}
      </button>
    </form>
  );
}


