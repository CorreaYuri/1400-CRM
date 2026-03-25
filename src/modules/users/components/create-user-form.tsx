"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { ManageableInboxOption } from "@/modules/users/server/user-service";

type CreateUserFormProps = {
  inboxes: ManageableInboxOption[];
  currentUserRole: UserRole;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  inboxIds: string[];
};

const defaultRoleByActor: Record<UserRole, UserRole> = {
  ADMIN: "AGENT",
  MANAGER: "AGENT",
  AGENT: "AGENT",
};

export function CreateUserForm({ inboxes, currentUserRole }: CreateUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    role: defaultRoleByActor[currentUserRole],
    inboxIds: [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableRoles: UserRole[] = currentUserRole === "ADMIN" ? ["ADMIN", "MANAGER", "AGENT"] : ["MANAGER", "AGENT"];

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleInbox(inboxId: string) {
    setForm((current) => ({
      ...current,
      inboxIds: current.inboxIds.includes(inboxId)
        ? current.inboxIds.filter((id) => id !== inboxId)
        : [...current.inboxIds, inboxId],
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel criar o usuario.");
        return;
      }

      setForm({
        name: "",
        email: "",
        password: "",
        role: defaultRoleByActor[currentUserRole],
        inboxIds: [],
      });
      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Usuario criado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 border border-slate-950 p-4">
      <div>
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Novo usuario</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Crie usuarios com senha inicial e defina as inboxes em que eles poderao atuar.
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
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Senha inicial</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Papel</span>
          <select
            value={form.role}
            onChange={(event) => updateField("role", event.target.value as UserRole)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {availableRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inboxes do usuario</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {inboxes.map((inbox) => {
            const checked = form.inboxIds.includes(inbox.id);

            return (
              <label key={inbox.id} className={`flex items-center gap-3 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInbox(inbox.id)}
                  className="h-4 w-4 border-slate-950"
                />
                <span>{inbox.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {message ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{message}</div> : null}
      {error ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{error}</div> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
        >
          {isPending ? "Criando..." : "Criar usuario"}
        </button>
      </div>
    </form>
  );
}
