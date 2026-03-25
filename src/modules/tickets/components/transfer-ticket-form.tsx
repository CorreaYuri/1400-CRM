"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboxOption } from "@/modules/tickets/server/types";
import { FormFeedback } from "@/shared/components/form-feedback";

type TransferTicketFormProps = {
  ticketId: string;
  currentInboxId: string;
  inboxes: InboxOption[];
};

export function TransferTicketForm({ ticketId, currentInboxId, inboxes }: TransferTicketFormProps) {
  const availableInboxes = useMemo(
    () => inboxes.filter((inbox) => inbox.id !== currentInboxId),
    [currentInboxId, inboxes],
  );

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inboxId, setInboxId] = useState(availableInboxes[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inboxId, reason }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const nextError =
          typeof payload.error === "string" ? payload.error : "Nao foi possivel transferir o chamado.";
        setError(nextError);
        return;
      }

      setReason("");
      setInboxId(availableInboxes[0]?.id ?? "");
      setMessage(payload.data.message ?? "Chamado transferido com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
      <div className="border-b border-zinc-100/15 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Transferir inbox
          </p>
          <span className="border border-slate-700 px-3 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-400">
            Gestor ou admin
          </span>
        </div>

      </div>

      {availableInboxes.length === 0 ? (
        <FormFeedback message="Nao ha outra inbox disponivel para transferir este chamado." tone="info" />
      ) : (
        <>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
                Inbox de destino
              </span>
              <select
                value={inboxId}
                onChange={(event) => setInboxId(event.target.value)}
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
                Motivo da transferencia
              </span>
              <textarea
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Explique por que o ticket deve sair desta fila e o que o novo setor precisa assumir."
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
              {isPending ? "Transferindo..." : "Transferir chamado"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
