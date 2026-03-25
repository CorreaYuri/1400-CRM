"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/shared/components/form-feedback";

type AddInteractionFormProps = {
  ticketId: string;
  variant?: "default" | "quick";
};

type InteractionType = "INTERNAL_NOTE" | "CUSTOMER_MESSAGE" | "AGREEMENT";

const quickTypeLabels: Record<Extract<InteractionType, "INTERNAL_NOTE" | "AGREEMENT">, string> = {
  INTERNAL_NOTE: "Observacao",
  AGREEMENT: "Acordo",
};

export function AddInteractionForm({ ticketId, variant = "default" }: AddInteractionFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<InteractionType>("INTERNAL_NOTE");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isQuick = variant === "quick";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const body = new FormData();
      body.set("type", type);
      body.set("content", content);
      attachments.forEach((file) => body.append("attachments", file));

      const response = await fetch(`/api/tickets/${ticketId}/interactions`, {
        method: "POST",
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        const nextError = typeof payload.error === "string" ? payload.error : "Nao foi possivel registrar a interacao.";
        setError(nextError);
        return;
      }

      setType("INTERNAL_NOTE");
      setContent("");
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(payload.data.message ?? "Interacao registrada com sucesso.");
      router.refresh();
    });
  }

  if (isQuick) {
    return (
      <div className="grid gap-4 px-4 py-4 sm:px-5">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.entries(quickTypeLabels) as Array<["INTERNAL_NOTE" | "AGREEMENT", string]>).map(([value, label]) => {
              const isActive = type === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={
                    isActive
                      ? "rounded-[0.58rem] border border-white/14 bg-white px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-slate-950"
                      : "rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-300 hover:bg-white/10"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <textarea
            rows={5}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="w-full rounded-[0.62rem] border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-400"
            placeholder={
              type === "AGREEMENT"
                ? "Registre o combinado que passa a valer para este atendimento."
                : "Registre uma observacao importante para a continuidade do chamado."
            }
          />

          <div className="grid gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
              className="w-full rounded-[0.62rem] border border-white/10 bg-slate-950 px-4 py-3 text-sm text-zinc-100 file:mr-4 file:border-0 file:bg-white file:px-3 file:py-2 file:font-heading file:text-xs file:uppercase file:tracking-[0.18em] file:text-slate-950"
            />
            {attachments.length > 0 ? (
              <div className="border border-white/10 bg-white/6 px-4 py-3 text-sm text-zinc-200">
                {attachments.map((file) => file.name).join(", ")}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="border border-zinc-100 px-4 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 transition-colors hover:bg-slate-900 disabled:opacity-50"
            >
              {isPending ? "Adicionando..." : `Adicionar ${type === "AGREEMENT" ? "acordo" : "observacao"}`}
            </button>
          </div>
        </form>

        {message ? <FormFeedback message={message} tone="success" /> : null}
        {error ? <FormFeedback message={error} tone="error" /> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-5">
      <div className="border-b border-zinc-100/15 pb-4">
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
          Nova interacao
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Tipo
          </span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as InteractionType)}
            className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-400"
          >
            <option value="INTERNAL_NOTE">Observacao interna</option>
            <option value="CUSTOMER_MESSAGE">Mensagem do solicitante</option>
            <option value="AGREEMENT">Acordo</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Conteudo
          </span>
          <textarea
            rows={5}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors focus:border-zinc-400"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">
            Anexos
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
            className="w-full border border-zinc-100 bg-slate-950 px-4 py-3 text-sm text-zinc-100 file:mr-4 file:border-0 file:bg-white file:px-3 file:py-2 file:font-heading file:text-xs file:uppercase file:tracking-[0.18em] file:text-slate-950"
          />
        </label>

        {attachments.length > 0 ? <FormFeedback message={attachments.map((file) => file.name).join(", ")} tone="info" /> : null}
        {message ? <FormFeedback message={message} tone="success" /> : null}
        {error ? <FormFeedback message={error} tone="error" /> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="border border-zinc-100 bg-zinc-100 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {isPending ? "Registrando..." : "Registrar interacao"}
          </button>
        </div>
      </div>
    </form>
  );
}

