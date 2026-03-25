"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/shared/components/form-feedback";

type ScheduleTicketFormProps = {
  ticketId: string;
};

function getDefaultDueAtValue() {
  const date = new Date();
  date.setHours(date.getHours() + 2);
  date.setMinutes(0, 0, 0);

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

export function ScheduleTicketForm({ ticketId }: ScheduleTicketFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialDueAt = useMemo(() => getDefaultDueAtValue(), []);
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dueAt, reason }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const nextError =
          typeof payload.error === "string" ? payload.error : "Nao foi possivel reagendar o chamado.";
        setError(nextError);
        return;
      }

      setReason("");
      setMessage(payload.data.message ?? "Chamado reagendado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
      <div className="border-b border-zinc-100/15 pb-4">
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
          Reagendar chamado
        </p>

      </div>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Retornar em
          </span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-400"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Motivo
          </span>
          <textarea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
            placeholder="Explique o que precisa acontecer ate a proxima retomada e o criterio para voltar ao chamado."
          />
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
          {isPending ? "Salvando..." : "Salvar reagendamento"}
        </button>
      </div>
    </form>
  );
}
