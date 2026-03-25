"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketOrigin, TicketPriority } from "@prisma/client";
import type { InboxOption } from "@/modules/tickets/server/types";

type CreateTicketFormProps = {
  inboxes: InboxOption[];
  defaultPriority: TicketPriority;
  allowedOrigins: TicketOrigin[];
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  inboxId: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  origin: TicketOrigin;
};

const originLabels: Record<TicketOrigin, string> = {
  INTERNAL: "Manual por atendente",
  CUSTOMER_PORTAL: "Portal do solicitante",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  API: "API",
};

export function CreateTicketForm({ inboxes, defaultPriority, allowedOrigins }: CreateTicketFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialState: FormState = {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    inboxId: inboxes[0]?.id ?? "",
    subject: "",
    description: "",
    priority: defaultPriority,
    origin: allowedOrigins[0] ?? "INTERNAL",
  };
  const [form, setForm] = useState<FormState>(initialState);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const body = new FormData();
      body.set("customerName", form.customerName);
      body.set("customerEmail", form.customerEmail);
      body.set("customerPhone", form.customerPhone);
      body.set("inboxId", form.inboxId);
      body.set("subject", form.subject);
      body.set("description", form.description);
      body.set("priority", form.priority);
      body.set("origin", form.origin);
      attachments.forEach((file) => body.append("attachments", file));

      const response = await fetch("/api/tickets", {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        const message = typeof payload.error === "string" ? payload.error : "Nao foi possivel criar o chamado.";
        setError(message);
        return;
      }

      setForm({
        ...initialState,
        inboxId: inboxes[0]?.id ?? "",
        priority: defaultPriority,
        origin: allowedOrigins[0] ?? "INTERNAL",
      });
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.push(`/tickets/${payload.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 px-5 py-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Solicitante">
          <input
            value={form.customerName}
            onChange={(event) => updateField("customerName", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-zinc-400"
            placeholder="Nome do solicitante"
          />
        </Field>

        <Field label="Inbox">
          <select
            value={form.inboxId}
            onChange={(event) => updateField("inboxId", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {inboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>
                {inbox.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Email do solicitante">
          <input
            type="email"
            value={form.customerEmail}
            onChange={(event) => updateField("customerEmail", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-zinc-400"
            placeholder="Opcional"
          />
        </Field>

        <Field label="Telefone do solicitante">
          <input
            value={form.customerPhone}
            onChange={(event) => updateField("customerPhone", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-zinc-400"
            placeholder="Opcional"
          />
        </Field>
      </div>

      <Field label="Assunto">
        <input
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-zinc-400"
          placeholder="Resumo do chamado"
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-[1fr_220px_220px]">
        <Field label="Descricao inicial">
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={8}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-zinc-400"
            placeholder="Registre o contexto, observacoes e combinados iniciais."
          />
        </Field>

        <Field label="Prioridade">
          <select
            value={form.priority}
            onChange={(event) => updateField("priority", event.target.value as TicketPriority)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </Field>

        <Field label="Origem">
          <select
            value={form.origin}
            onChange={(event) => updateField("origin", event.target.value as TicketOrigin)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {allowedOrigins.map((origin) => (
              <option key={origin} value={origin}>
                {originLabels[origin]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Anexos">
        <div className="grid gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 file:mr-4 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-heading file:text-xs file:uppercase file:tracking-[0.18em] file:text-zinc-100"
          />
          <p className="text-sm leading-6 text-slate-700">
            Aceita imagem, PDF, DOCX, XLSX, TXT, CSV, ZIP ou RAR. Ate 5 arquivos por envio, com 25 MB cada.
          </p>
          {attachments.length > 0 ? (
            <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">
              {attachments.map((file) => file.name).join(", ")}
            </div>
          ) : null}
        </div>
      </Field>

      {error ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{error}</div> : null}

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50">
          {isPending ? "Criando..." : "Criar chamado"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

