"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/shared/components/form-feedback";

type CloseTicketQuickFormProps = {
  ticketId: string;
  closureReasons: string[];
};

export function CloseTicketQuickForm({ ticketId, closureReasons }: CloseTicketQuickFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedClosureReason, setSelectedClosureReason] = useState(closureReasons[0] ?? "");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedClosureReason,
          resolutionSummary,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const fieldError = payload?.error?.fieldErrors?.reason?.[0];
        setError(typeof payload.error === "string" ? payload.error : fieldError ?? "Nao foi possivel finalizar o chamado.");
        return;
      }

      setResolutionSummary("");
      setMessage(payload.data.message ?? "Chamado finalizado com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 px-4 py-4 sm:px-5">
      <label className="grid gap-2">
        <span className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-400">Motivo</span>
        <select
          value={selectedClosureReason}
          onChange={(event) => setSelectedClosureReason(event.target.value)}
          disabled={isPending}
          className="w-full rounded-[0.58rem] border border-white/10 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none"
        >
          {closureReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-400">Resumo da solucao</span>
        <textarea
          rows={3}
          value={resolutionSummary}
          onChange={(event) => setResolutionSummary(event.target.value)}
          disabled={isPending}
          placeholder="Opcional"
          className="w-full rounded-[0.58rem] border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500"
        />
      </label>

      {message ? <FormFeedback message={message} tone="success" /> : null}
      {error ? <FormFeedback message={error} tone="error" /> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending || !selectedClosureReason}
          className="crm-btn-secondary text-[0.62rem] disabled:opacity-50"
        >
          {isPending ? "Finalizando..." : "Finalizar chamado"}
        </button>
      </div>
    </div>
  );
}
