"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboxOption } from "@/modules/tickets/server/types";
import { FormFeedback } from "@/shared/components/form-feedback";

type ChildTicketFormProps = {
  ticketId: string;
  currentInboxId: string;
  inboxes: InboxOption[];
};

type FormState = {
  inboxId: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
};

export function ChildTicketForm({ ticketId, currentInboxId, inboxes }: ChildTicketFormProps) {
  const availableInboxes = useMemo(
    () => inboxes.filter((inbox) => inbox.id !== currentInboxId),
    [currentInboxId, inboxes],
  );

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    inboxId: availableInboxes[0]?.id ?? "",
    subject: "",
    description: "",
    priority: "MEDIUM",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) => {
      if (availableInboxes.length === 0) {
        if (current.inboxId === "") {
          return current;
        }

        return {
          ...current,
          inboxId: "",
        };
      }

      const inboxStillAvailable = availableInboxes.some((inbox) => inbox.id === current.inboxId);

      if (inboxStillAvailable) {
        return current;
      }

      return {
        ...current,
        inboxId: availableInboxes[0]?.id ?? "",
      };
    });
  }, [availableInboxes]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm({
      inboxId: availableInboxes[0]?.id ?? "",
      subject: "",
      description: "",
      priority: "MEDIUM",
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/child`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        const nextError =
          typeof payload.error === "string" ? payload.error : "Nao foi possivel criar o chamado filho.";
        setError(nextError);
        return;
      }

      resetForm();
      setMessage(payload.data.message ?? "Chamado filho criado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
      <div className="border-b border-zinc-100/15 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Chamado filho
          </p>
          <span className="border border-slate-700 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-400">
            Agente, gestor ou admin
          </span>
        </div>

      </div>

      {availableInboxes.length === 0 ? (
        <FormFeedback message="Nao ha outra inbox disponivel para abrir um chamado filho." tone="info" />
      ) : (
        <>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                Inbox de destino
              </span>
              <select
                value={form.inboxId}
                onChange={(event) => updateField("inboxId", event.target.value)}
                className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-400"
              >
                {availableInboxes.map((inbox) => (
                  <option key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                Assunto
              </span>
              <input
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Resumo da demanda derivada para o outro setor."
              />
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                Contexto enviado
              </span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Explique o que a outra inbox precisa validar, responder ou executar."
              />
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                Prioridade
              </span>
              <select
                value={form.priority}
                onChange={(event) => updateField("priority", event.target.value as FormState["priority"])}
                className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-400"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </label>
          </div>

          {message ? <FormFeedback message={message} tone="success" /> : null}
          {error ? <FormFeedback message={error} tone="error" /> : null}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="border border-zinc-100 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 transition-colors hover:bg-slate-900 disabled:opacity-50"
            >
              {isPending ? "Criando..." : "Abrir chamado filho"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
