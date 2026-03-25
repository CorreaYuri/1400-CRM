"use client";

import { useRef, useState, useTransition } from "react";

type PortalInboxOption = {
  id: string;
  name: string;
};

type PortalTicketFormProps = {
  tenantSlug: string;
  tenantName: string;
  inboxes: PortalInboxOption[];
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  inboxId: string;
  subject: string;
  description: string;
};

export function PortalTicketForm({ tenantSlug, tenantName, inboxes }: PortalTicketFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialState: FormState = {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    inboxId: inboxes[0]?.id ?? "",
    subject: "",
    description: "",
  };
  const [form, setForm] = useState<FormState>(initialState);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessTicketId(null);

    startTransition(async () => {
      const body = new FormData();
      body.set("customerName", form.customerName);
      body.set("customerEmail", form.customerEmail);
      body.set("customerPhone", form.customerPhone);
      body.set("inboxId", form.inboxId);
      body.set("subject", form.subject);
      body.set("description", form.description);
      attachments.forEach((file) => body.append("attachments", file));

      const response = await fetch(`/api/portal/${tenantSlug}/tickets`, {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        const nextError = typeof payload.error === "string" ? payload.error : "Nao foi possivel abrir o chamado agora.";
        setError(nextError);
        return;
      }

      setForm({
        ...initialState,
        inboxId: inboxes[0]?.id ?? "",
      });
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccessTicketId(typeof payload.data?.id === "string" ? payload.data.id : null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="border border-slate-900/10 bg-slate-50 px-4 py-3">
        <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">
          Chamado para
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900 sm:text-base">{tenantName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Seu nome">
          <input
            value={form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            placeholder="Como podemos te identificar?"
          />
        </Field>

        <Field label="Setor">
          <select
            value={form.inboxId}
            onChange={(event) => updateField("inboxId", event.target.value)}
            className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {inboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>
                {inbox.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={form.customerEmail}
            onChange={(event) => updateField("customerEmail", event.target.value)}
            className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            placeholder="Opcional"
          />
        </Field>

        <Field label="Telefone">
          <input
            value={form.customerPhone}
            onChange={(event) => updateField("customerPhone", event.target.value)}
            className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            placeholder="Opcional"
          />
        </Field>
      </div>

      <Field label="Assunto">
        <input
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
          placeholder="Resumo rapido do seu chamado"
        />
      </Field>

      <Field label="Descreva o que aconteceu">
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={8}
          className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400"
          placeholder="Explique o contexto, impacto e qualquer detalhe que ajude o atendimento."
        />
      </Field>

      <Field label="Anexos">
        <div className="grid gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
            className="w-full rounded-[0.62rem] border border-slate-900/12 bg-white px-4 py-3 text-sm text-slate-950 file:mr-4 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-heading file:text-xs file:uppercase file:tracking-[0.18em] file:text-zinc-100"
          />
          <p className="text-sm leading-6 text-slate-600">
            Voce pode enviar ate 5 anexos por chamado, com 25 MB cada.
          </p>
          {attachments.length > 0 ? (
            <div className="rounded-[0.62rem] border border-slate-900/12 bg-slate-50 px-4 py-3 text-sm text-slate-900">
              {attachments.map((file) => file.name).join(", ")}
            </div>
          ) : null}
        </div>
      </Field>

      {successTicketId ? (
        <div className="rounded-[0.68rem] border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Chamado registrado com sucesso. Protocolo: <strong>{successTicketId}</strong>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[0.68rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 pt-5">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Ao enviar, o chamado entra na fila da equipe responsavel e recebe um protocolo imediatamente.
        </p>
        <button type="submit" disabled={isPending} className="crm-btn-primary text-sm disabled:opacity-50">
          {isPending ? "Enviando..." : "Abrir chamado"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

