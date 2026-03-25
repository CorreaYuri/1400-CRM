"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CreateInboxFormProps = {
  defaultActive?: boolean;
};

type CreateInboxFormState = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  firstResponseSlaMinutes: string;
  resolutionSlaHours: string;
};

export function CreateInboxForm({ defaultActive = true }: CreateInboxFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CreateInboxFormState>({
    name: "",
    code: "",
    description: "",
    isActive: defaultActive,
    firstResponseSlaMinutes: "",
    resolutionSlaHours: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CreateInboxFormState>(field: K, value: CreateInboxFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/inboxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          firstResponseSlaMinutes: normalizeNumericField(form.firstResponseSlaMinutes),
          resolutionSlaHours: normalizeNumericField(form.resolutionSlaHours),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel criar a inbox.");
        return;
      }

      setForm({
        name: "",
        code: "",
        description: "",
        isActive: defaultActive,
        firstResponseSlaMinutes: "",
        resolutionSlaHours: "",
      });
      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Inbox criada com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 border border-slate-950 p-4">
      <div>
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nova inbox</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Cadastre uma nova fila operacional com nome, codigo interno, descricao curta e metas de SLA para a execucao.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nome</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Codigo</span>
          <input
            value={form.code}
            onChange={(event) => updateField("code", event.target.value.toUpperCase())}
            placeholder="Ex.: FIN"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Descricao</span>
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={4}
          className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">SLA primeira acao</span>
          <input
            type="number"
            min="1"
            value={form.firstResponseSlaMinutes}
            onChange={(event) => updateField("firstResponseSlaMinutes", event.target.value)}
            placeholder="Minutos"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">SLA resolucao</span>
          <input
            type="number"
            min="1"
            value={form.resolutionSlaHours}
            onChange={(event) => updateField("resolutionSlaHours", event.target.value)}
            placeholder="Horas"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 border border-slate-950 px-4 py-3 text-sm text-slate-950">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
          className="h-4 w-4 border-slate-950"
        />
        <span>Inbox ativa</span>
      </label>

      {message ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{message}</div> : null}
      {error ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{error}</div> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
        >
          {isPending ? "Criando..." : "Criar inbox"}
        </button>
      </div>
    </form>
  );
}

function normalizeNumericField(value: string) {
  const normalized = Number.parseInt(value.trim(), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}
