"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboxManagementItem, InboxMemberOption } from "@/modules/inboxes/server/inbox-service";

type InboxManagerProps = {
  inboxes: InboxManagementItem[];
  users: InboxMemberOption[];
  initialTeamCoverageFilter?: string;
};

type InboxEditorState = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  firstResponseSlaMinutes: string;
  resolutionSlaHours: string;
  memberIds: string[];
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TeamCoverageFilter = "ALL" | "WITH_TEAM" | "WITHOUT_TEAM";

type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function InboxManager({ inboxes, users, initialTeamCoverageFilter }: InboxManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [teamCoverageFilter, setTeamCoverageFilter] = useState<TeamCoverageFilter>(() => normalizeTeamCoverageFilter(initialTeamCoverageFilter));
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<UserStatusFilter>("ACTIVE");
  const [selectedInboxId, setSelectedInboxId] = useState(inboxes[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [membersMessage, setMembersMessage] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [form, setForm] = useState<InboxEditorState>(() => buildInboxEditorState(inboxes[0] ?? null));

  const filteredInboxes = inboxes.filter((inbox) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      inbox.name.toLowerCase().includes(normalizedSearch) ||
      inbox.code.toLowerCase().includes(normalizedSearch) ||
      inbox.description.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && inbox.isActive) ||
      (statusFilter === "INACTIVE" && !inbox.isActive);
    const matchesCoverage =
      teamCoverageFilter === "ALL" ||
      (teamCoverageFilter === "WITH_TEAM" && inbox.membershipCount > 0) ||
      (teamCoverageFilter === "WITHOUT_TEAM" && inbox.membershipCount === 0);

    return matchesSearch && matchesStatus && matchesCoverage;
  });

  const selectedInbox = filteredInboxes.find((inbox) => inbox.id === selectedInboxId)
    ?? inboxes.find((inbox) => inbox.id === selectedInboxId)
    ?? null;
  const filteredCountLabel = `${filteredInboxes.length} de ${inboxes.length} inbox(es)`;
  const canArchiveSelectedInbox = Boolean(selectedInbox && selectedInbox.queueCount === 0);
  const visibleUsers = users.filter((user) => {
    const normalizedSearch = memberSearch.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch) ||
      user.role.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      memberStatusFilter === "ALL" ||
      (memberStatusFilter === "ACTIVE" && user.isActive) ||
      (memberStatusFilter === "INACTIVE" && !user.isActive);

    return matchesSearch && matchesStatus;
  });
  const selectedMembers = users.filter((user) => form.memberIds.includes(user.id));

  useEffect(() => {
    if (filteredInboxes.length === 0) {
      setSelectedInboxId("");
      return;
    }

    const stillVisible = filteredInboxes.some((inbox) => inbox.id === selectedInboxId);

    if (!stillVisible) {
      setSelectedInboxId(filteredInboxes[0]?.id ?? "");
    }
  }, [filteredInboxes, selectedInboxId]);

  useEffect(() => {
    const nextSelectedInbox = inboxes.find((inbox) => inbox.id === selectedInboxId) ?? null;
    setForm(buildInboxEditorState(nextSelectedInbox));
  }, [selectedInboxId, inboxes]);

  function updateField<K extends keyof InboxEditorState>(field: K, value: InboxEditorState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleMember(userId: string) {
    const user = users.find((item) => item.id === userId);

    if (!user?.isActive) {
      return;
    }

    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(userId)
        ? current.memberIds.filter((id) => id !== userId)
        : [...current.memberIds, userId],
    }));
  }

  function resetMessages() {
    setMessage(null);
    setError(null);
    setArchiveMessage(null);
    setArchiveError(null);
    setMembersMessage(null);
    setMembersError(null);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedInboxId) {
      setError("Selecione uma inbox para continuar.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/inboxes/${selectedInboxId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          description: form.description,
          isActive: form.isActive,
          firstResponseSlaMinutes: normalizeNumericField(form.firstResponseSlaMinutes),
          resolutionSlaHours: normalizeNumericField(form.resolutionSlaHours),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar a inbox.");
        return;
      }

      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Inbox atualizada com sucesso.");
      router.refresh();
    });
  }

  function handleMembersSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMembersMessage(null);
    setMembersError(null);

    if (!selectedInboxId) {
      setMembersError("Selecione uma inbox para vincular a equipe.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/inboxes/${selectedInboxId}/members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: form.memberIds }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setMembersError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar os membros da inbox.");
        return;
      }

      setMembersMessage(typeof payload.data?.message === "string" ? payload.data.message : "Membros atualizados com sucesso.");
      router.refresh();
    });
  }

  function handleArchive() {
    setArchiveMessage(null);
    setArchiveError(null);

    if (!selectedInboxId) {
      setArchiveError("Selecione uma inbox para arquivar.");
      return;
    }

    if (!canArchiveSelectedInbox) {
      setArchiveError("Esvazie a fila antes de arquivar esta inbox.");
      return;
    }

    const confirmed = window.confirm("Arquivar esta inbox? Ela sera marcada como inativa e deixara de receber novos chamados.");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/inboxes/${selectedInboxId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setArchiveError(typeof payload.error === "string" ? payload.error : "Nao foi possivel arquivar a inbox.");
        return;
      }

      setArchiveMessage(typeof payload.data?.message === "string" ? payload.data.message : "Inbox arquivada com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid gap-4 border border-slate-950 p-4">
        <div>
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Filtros</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Refine a lista por busca textual e status da inbox.</p>
        </div>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Buscar</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, codigo ou descricao"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todas</option>
            <option value="ACTIVE">Ativas</option>
            <option value="INACTIVE">Inativas</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Equipe</span>
          <select
            value={teamCoverageFilter}
            onChange={(event) => setTeamCoverageFilter(event.target.value as TeamCoverageFilter)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todas</option>
            <option value="WITH_TEAM">Com equipe</option>
            <option value="WITHOUT_TEAM">Sem equipe</option>
          </select>
        </label>

        <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">
          {filteredCountLabel}
        </div>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inbox</span>
          <select
            value={selectedInboxId}
            onChange={(event) => {
              setSelectedInboxId(event.target.value);
              resetMessages();
            }}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {filteredInboxes.length === 0 ? <option value="">Nenhuma inbox encontrada</option> : null}
            {filteredInboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>
                {inbox.name} - {inbox.code}
              </option>
            ))}
          </select>
        </label>

        {selectedInbox ? (
          <div className="grid gap-2 text-sm text-slate-700">
            <p><strong>Nome:</strong> {selectedInbox.name}</p>
            <p><strong>Codigo:</strong> {selectedInbox.code}</p>
            <p><strong>Status:</strong> {selectedInbox.isActive ? "Ativa" : "Inativa"}</p>
            <p><strong>Fila aberta:</strong> {selectedInbox.queueCount}</p>
            <p><strong>Equipe vinculada:</strong> {selectedInbox.membershipCount}</p>
            <p><strong>SLA primeira acao:</strong> {selectedInbox.firstResponseSlaMinutes ? `${selectedInbox.firstResponseSlaMinutes} min` : "Nao definido"}</p>
            <p><strong>SLA resolucao:</strong> {selectedInbox.resolutionSlaHours ? `${selectedInbox.resolutionSlaHours} h` : "Nao definido"}</p>
            <p><strong>Membros atuais:</strong> {selectedInbox.memberNames.length > 0 ? selectedInbox.memberNames.join(", ") : "Nenhum"}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5">
        <form onSubmit={handleSave} className="grid gap-5 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Editar inbox</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Atualize dados da fila, descricao do setor e status de disponibilidade da inbox.
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
              disabled={isPending || !selectedInboxId}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </form>

        <form onSubmit={handleMembersSave} className="grid gap-5 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Equipe da inbox</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Vincule usuarios ativos que podem atuar nessa fila. O acesso operacional do `AGENT` depende desses vinculos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Buscar membro</span>
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Nome, email ou papel"
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Status do usuario</span>
              <select
                value={memberStatusFilter}
                onChange={(event) => setMemberStatusFilter(event.target.value as UserStatusFilter)}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleUsers.map((user) => {
              const checked = form.memberIds.includes(user.id);
              const disabled = !user.isActive;

              return (
                <label key={user.id} className={`grid gap-1 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"} ${disabled ? "opacity-60" : ""}`}>
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(user.id)}
                      disabled={disabled}
                      className="h-4 w-4 border-slate-950"
                    />
                    <strong>{user.name}</strong>
                  </span>
                  <span>{user.role}</span>
                  <span>{user.email}</span>
                  <span>{user.isActive ? "Ativo" : "Inativo"}</span>
                </label>
              );
            })}
          </div>

          <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">
            {selectedMembers.length > 0
              ? `Selecionados: ${selectedMembers.map((user) => user.name).join(", ")}`
              : "Nenhum membro selecionado para esta inbox."}
          </div>

          {membersMessage ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{membersMessage}</div> : null}
          {membersError ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{membersError}</div> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !selectedInboxId}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar equipe"}
            </button>
          </div>
        </form>

        <div className="grid gap-4 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Arquivamento</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Arquiva a inbox para impedir novos fluxos nela. A fila precisa estar zerada antes da operacao.
            </p>
          </div>

          {!canArchiveSelectedInbox && selectedInbox ? (
            <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-700">
              Esta inbox ainda possui {selectedInbox.queueCount} chamado(s) aberto(s). Transfira ou finalize a fila antes de arquivar.
            </div>
          ) : null}

          {archiveMessage ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{archiveMessage}</div> : null}
          {archiveError ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{archiveError}</div> : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending || !selectedInboxId || !canArchiveSelectedInbox}
              className="border border-slate-950 bg-zinc-100 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 disabled:opacity-50"
            >
              {isPending ? "Processando..." : "Arquivar inbox"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeTeamCoverageFilter(value?: string): TeamCoverageFilter {
  if (value === "WITH_TEAM" || value === "WITHOUT_TEAM") {
    return value;
  }

  return "ALL";
}

function buildInboxEditorState(inbox: InboxManagementItem | null): InboxEditorState {
  return {
    name: inbox?.name ?? "",
    code: inbox?.code ?? "",
    description: inbox?.description ?? "",
    isActive: inbox?.isActive ?? true,
    firstResponseSlaMinutes: inbox?.firstResponseSlaMinutes ? String(inbox.firstResponseSlaMinutes) : "",
    resolutionSlaHours: inbox?.resolutionSlaHours ? String(inbox.resolutionSlaHours) : "",
    memberIds: inbox?.memberIds ?? [],
  };
}

function normalizeNumericField(value: string) {
  const normalized = Number.parseInt(value.trim(), 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}




