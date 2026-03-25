"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketAssigneeOption } from "@/modules/tickets/server/types";
import { FormFeedback } from "@/shared/components/form-feedback";

type TicketActionsProps = {
  ticketId: string;
  status: string;
  ownerId?: string;
  currentUserId: string;
  assignees: TicketAssigneeOption[];
  canManageAnyTicket: boolean;
  closureReasons: string[];
  showClose?: boolean;
  showReassign?: boolean;
  layout?: "card" | "inline";
};

export function TicketActions({
  ticketId,
  status,
  ownerId,
  currentUserId,
  assignees,
  canManageAnyTicket,
  closureReasons,
  showClose = true,
  showReassign = true,
  layout = "card",
}: TicketActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(status);
  const [localOwnerId, setLocalOwnerId] = useState(ownerId);
  const teammateOptions = useMemo(
    () => assignees.filter((assignee) => assignee.id !== currentUserId),
    [assignees, currentUserId],
  );
  const [selectedUserId, setSelectedUserId] = useState(teammateOptions[0]?.id ?? "");
  const [selectedClosureReason, setSelectedClosureReason] = useState(closureReasons[0] ?? "");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const isFinished = localStatus === "Fechado" || localStatus === "Cancelado";
  const isInProgress = localStatus === "Em atendimento";
  const isOwner = localOwnerId === currentUserId;
  const canClose = showClose && !isFinished && isInProgress && (canManageAnyTicket || isOwner);
  const canAssume = !isFinished && (!isInProgress || !isOwner);
  const canReassign = showReassign && !isFinished && teammateOptions.length > 0;

  function handleAction(action: "assign" | "close", payload?: Record<string, string>) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const hasPayload = payload && Object.keys(payload).length > 0;
      const response = await fetch(`/api/tickets/${ticketId}/${action}`, {
        method: "POST",
        headers: hasPayload ? { "Content-Type": "application/json" } : undefined,
        body: hasPayload ? JSON.stringify(payload) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        const fieldError = data?.error?.fieldErrors?.reason?.[0];
        setError(typeof data.error === "string" ? data.error : fieldError ?? "Nao foi possivel executar a acao.");
        return;
      }

      if (action === "assign") {
        setLocalStatus("Em atendimento");
        setLocalOwnerId(payload?.userId ?? currentUserId);
      }

      if (action === "close") {
        setLocalStatus("Fechado");
      }

      setMessage(data.data.message ?? "Acao executada com sucesso.");
      router.refresh();
    });
  }

  if (layout === "inline") {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2.5 border border-white/10 bg-white/6 px-3 py-2.5">
          <span className="font-heading text-[0.5rem] uppercase tracking-[0.18em] text-zinc-500">
            Acoes
          </span>

          <span className="border border-white/14 bg-white/10 px-2 py-1 font-heading text-[0.52rem] uppercase tracking-[0.18em] text-zinc-100">
            {localStatus}
          </span>

          {canAssume ? (
            <button
              type="button"
              onClick={() => handleAction("assign")}
              disabled={isPending}
              className="border border-emerald-300/35 bg-emerald-400/12 px-2.5 py-1.5 font-heading text-[0.52rem] uppercase tracking-[0.18em] text-emerald-100 transition-colors hover:bg-emerald-400/18 disabled:opacity-50"
            >
              Assumir
            </button>
          ) : null}

          {canReassign ? (
            <>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={isPending}
                className="min-w-[11rem] border border-white/12 bg-slate-950/55 px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors focus:border-amber-300 disabled:opacity-50"
              >
                {teammateOptions.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleAction("assign", { userId: selectedUserId })}
                disabled={isPending || !selectedUserId}
                className="border border-white/14 bg-white/8 px-2.5 py-1.5 font-heading text-[0.52rem] uppercase tracking-[0.18em] text-zinc-100 transition-colors hover:bg-white/12 disabled:opacity-50"
              >
                Repassar
              </button>
            </>
          ) : null}

          {canClose ? (
            <button
              type="button"
              onClick={() => handleAction("close", { reason: selectedClosureReason, resolutionSummary })}
              disabled={isPending || !selectedClosureReason}
              className="border border-amber-300/35 bg-amber-300/10 px-2.5 py-1.5 font-heading text-[0.52rem] uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-300/16 disabled:opacity-50"
            >
              Finalizar
            </button>
          ) : null}
        </div>

        {message ? <FormFeedback message={message} tone="success" /> : null}
        {error ? <FormFeedback message={error} tone="error" /> : null}
      </div>
    );
  }

  return (
    <section className="border border-zinc-100/12 bg-white/4 px-3.5 py-3 sm:px-4">
      <div className="border-b border-zinc-100/10 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-500">
              Acoes do chamado
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-[0.5rem] border border-zinc-700 px-2.5 py-1.5 font-heading text-[0.56rem] uppercase tracking-[0.18em] text-zinc-400">
              {localStatus}
            </span>
          </div>
        </div>
      </div>

      {canAssume || canClose ? (
        <div className="mt-3 grid gap-2.5">
          {canAssume ? (
            <button
              type="button"
              onClick={() => handleAction("assign")}
              disabled={isPending}
              className="rounded-[0.58rem] border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.18))] px-3.5 py-3 text-left transition-colors hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.26))] disabled:opacity-50"
            >
              <span className="font-heading text-[0.72rem] uppercase tracking-[0.2em] text-emerald-50">Assumir para mim</span>
            </button>
          ) : null}

          {canClose ? (
            <div className="rounded-[0.66rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(254,243,199,0.92))] px-4 py-3.5">
              <div className="grid gap-2.5">
                <label className="grid gap-2">
                  <span className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-600">Motivo</span>
                  <select
                    value={selectedClosureReason}
                    onChange={(event) => setSelectedClosureReason(event.target.value)}
                    disabled={isPending}
                    className="w-full border border-amber-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition-colors focus:border-amber-500 disabled:opacity-50"
                  >
                    {closureReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="font-heading text-[0.58rem] uppercase tracking-[0.2em] text-slate-600">Resumo</span>
                  <textarea
                    value={resolutionSummary}
                    onChange={(event) => setResolutionSummary(event.target.value)}
                    rows={3}
                    disabled={isPending}
                    placeholder="Resumo opcional da solucao."
                    className="w-full resize-none border border-amber-300 bg-white px-3 py-2.5 text-sm leading-5 text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 disabled:opacity-50"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleAction("close", { reason: selectedClosureReason, resolutionSummary })}
                  disabled={isPending || !selectedClosureReason}
                  className="crm-btn-secondary w-full text-[0.72rem] disabled:opacity-50"
                >
                  Finalizar chamado
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canReassign ? (
        <div className="mt-3 border border-zinc-100/10 p-3">
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Repassar para integrante
          </p>
          <div className="mt-3 grid gap-3">
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={isPending}
              className="crm-dark-field w-full rounded-[0.58rem] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-amber-300 disabled:opacity-50"
            >
              {teammateOptions.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleAction("assign", { userId: selectedUserId })}
              disabled={isPending || !selectedUserId}
              className="crm-btn-secondary w-full text-sm disabled:opacity-50"
            >
              Repassar chamado
            </button>
          </div>
        </div>
      ) : null}

      {message ? <FormFeedback message={message} tone="success" /> : null}
      {error ? <FormFeedback message={error} tone="error" /> : null}
    </section>
  );
}
