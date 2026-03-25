"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { ManageableInboxOption, UserInboxMembershipItem } from "@/modules/users/server/user-service";
import { UserAvatar } from "@/shared/components/user-avatar";

type UserInboxMembershipManagerProps = {
  users: UserInboxMembershipItem[];
  inboxes: ManageableInboxOption[];
  currentUserRole: UserRole;
  currentUserId: string;
  initialCoverageFilter?: string;
};

type UserEditorState = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  inboxIds: string[];
  password: string;
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type RoleFilter = "ALL" | UserRole;
type InboxCoverageFilter = "ALL" | "WITH_INBOX" | "WITHOUT_INBOX";
type AvatarImageMetrics = {
  width: number;
  height: number;
};

const AVATAR_EXPORT_SIZE = 512;
const AVATAR_PREVIEW_SIZE = 208;

export function UserInboxMembershipManager({
  users,
  inboxes,
  currentUserRole,
  currentUserId,
  initialCoverageFilter,
}: UserInboxMembershipManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [inboxFilter, setInboxFilter] = useState("ALL");
  const [coverageFilter, setCoverageFilter] = useState<InboxCoverageFilter>(() => normalizeCoverageFilter(initialCoverageFilter));
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarImageMetrics, setAvatarImageMetrics] = useState<AvatarImageMetrics | null>(null);
  const [avatarCropScale, setAvatarCropScale] = useState(1);
  const [avatarCropX, setAvatarCropX] = useState(0);
  const [avatarCropY, setAvatarCropY] = useState(0);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [form, setForm] = useState<UserEditorState>(() => buildEditorState(users[0] ?? null));

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && user.isActive) ||
      (statusFilter === "INACTIVE" && !user.isActive);
    const matchesInbox = inboxFilter === "ALL" || user.inboxIds.includes(inboxFilter);
    const matchesCoverage =
      coverageFilter === "ALL" ||
      (coverageFilter === "WITH_INBOX" && user.inboxIds.length > 0) ||
      (coverageFilter === "WITHOUT_INBOX" && user.inboxIds.length === 0);

    return matchesSearch && matchesRole && matchesStatus && matchesInbox && matchesCoverage;
  });

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId)
    ?? users.find((user) => user.id === selectedUserId)
    ?? null;
  const canEditSelectedUser = selectedUser ? currentUserRole === "ADMIN" || selectedUser.role !== "ADMIN" : false;
  const canDeleteSelectedUser = Boolean(selectedUser && canEditSelectedUser && selectedUser.id !== currentUserId);
  const availableRoles: UserRole[] = currentUserRole === "ADMIN" ? ["ADMIN", "MANAGER", "AGENT"] : ["MANAGER", "AGENT"];
  const filteredCountLabel = `${filteredUsers.length} de ${users.length} usuario(s)`;
  const selectedAvatarLabel = avatarFile ? `${avatarFile.name} (${formatFileSize(avatarFile.size)})` : "Nenhuma imagem selecionada";

  const avatarPreviewLayout = useMemo(() => {
    if (!avatarImageMetrics) {
      return null;
    }

    return getCropLayout(
      avatarImageMetrics.width,
      avatarImageMetrics.height,
      AVATAR_PREVIEW_SIZE,
      avatarCropScale,
      avatarCropX,
      avatarCropY,
    );
  }, [avatarCropScale, avatarCropX, avatarCropY, avatarImageMetrics]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId("");
      return;
    }

    const stillVisible = filteredUsers.some((user) => user.id === selectedUserId);

    if (!stillVisible) {
      setSelectedUserId(filteredUsers[0]?.id ?? "");
    }
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    const nextSelectedUser = users.find((user) => user.id === selectedUserId) ?? null;
    setForm(buildEditorState(nextSelectedUser));
    resetAvatarDraft();
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      setAvatarImageMetrics(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);
    setAvatarCropScale(1);
    setAvatarCropX(0);
    setAvatarCropY(0);

    const image = new Image();
    image.onload = () => {
      setAvatarImageMetrics({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  function resetAvatarDraft() {
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarImageMetrics(null);
    setAvatarCropScale(1);
    setAvatarCropX(0);
    setAvatarCropY(0);
    setAvatarInputKey((current) => current + 1);
  }

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    setMessage(null);
    setError(null);
    setPasswordMessage(null);
    setPasswordError(null);
    setDeleteMessage(null);
    setDeleteError(null);
    setAvatarMessage(null);
    setAvatarError(null);
  }

  function updateField<K extends keyof UserEditorState>(field: K, value: UserEditorState[K]) {
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

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedUserId) {
      setError("Selecione um usuario para continuar.");
      return;
    }

    if (!canEditSelectedUser) {
      setError("Somente administradores podem editar um usuario ADMIN.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
          inboxIds: form.inboxIds,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar o usuario.");
        return;
      }

      setMessage(typeof payload.data?.message === "string" ? payload.data.message : "Usuario atualizado com sucesso.");
      router.refresh();
    });
  }

  function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!selectedUserId) {
      setPasswordError("Selecione um usuario para redefinir a senha.");
      return;
    }

    if (!canEditSelectedUser) {
      setPasswordError("Somente administradores podem redefinir a senha de um usuario ADMIN.");
      return;
    }

    if (!form.password) {
      setPasswordError("Informe uma nova senha antes de redefinir.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${selectedUserId}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: form.password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setPasswordError(typeof payload.error === "string" ? payload.error : "Nao foi possivel redefinir a senha.");
        return;
      }

      setForm((current) => ({ ...current, password: "" }));
      setPasswordMessage(typeof payload.data?.message === "string" ? payload.data.message : "Senha redefinida com sucesso.");
      router.refresh();
    });
  }

  function handleAvatarUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvatarMessage(null);
    setAvatarError(null);

    if (!selectedUserId) {
      setAvatarError("Selecione um usuario para atualizar a foto.");
      return;
    }

    if (!canEditSelectedUser) {
      setAvatarError("Somente administradores podem atualizar a foto de um usuario ADMIN.");
      return;
    }

    if (!avatarFile) {
      setAvatarError("Selecione uma imagem JPG, PNG ou WEBP antes de enviar.");
      return;
    }

    startTransition(async () => {
      try {
        const croppedAvatar = await buildCroppedAvatarFile(avatarFile, avatarCropScale, avatarCropX, avatarCropY);
        const body = new FormData();
        body.append("avatar", croppedAvatar);

        const response = await fetch(`/api/users/${selectedUserId}/avatar`, {
          method: "POST",
          body,
        });

        const payload = await response.json();

        if (!response.ok) {
          setAvatarError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar a foto.");
          return;
        }

        resetAvatarDraft();
        setAvatarMessage(typeof payload.data?.message === "string" ? payload.data.message : "Foto atualizada com sucesso.");
        router.refresh();
      } catch (error) {
        setAvatarError(error instanceof Error ? error.message : "Nao foi possivel preparar a foto para envio.");
      }
    });
  }

  function handleAvatarRemoval() {
    setAvatarMessage(null);
    setAvatarError(null);

    if (!selectedUserId) {
      setAvatarError("Selecione um usuario para remover a foto.");
      return;
    }

    if (!canEditSelectedUser) {
      setAvatarError("Somente administradores podem remover a foto de um usuario ADMIN.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${selectedUserId}/avatar`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setAvatarError(typeof payload.error === "string" ? payload.error : "Nao foi possivel remover a foto.");
        return;
      }

      resetAvatarDraft();
      setAvatarMessage(typeof payload.data?.message === "string" ? payload.data.message : "Foto removida com sucesso.");
      router.refresh();
    });
  }

  function handleSoftDelete() {
    setDeleteMessage(null);
    setDeleteError(null);

    if (!selectedUserId) {
      setDeleteError("Selecione um usuario para arquivar.");
      return;
    }

    if (!canDeleteSelectedUser) {
      setDeleteError("Esse usuario nao pode ser arquivado por este perfil.");
      return;
    }

    const confirmed = window.confirm("Arquivar este usuario? Ele sera desativado e perdera o vinculo com todas as inboxes.");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${selectedUserId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setDeleteError(typeof payload.error === "string" ? payload.error : "Nao foi possivel arquivar o usuario.");
        return;
      }

      setDeleteMessage(typeof payload.data?.message === "string" ? payload.data.message : "Usuario arquivado com sucesso.");
      router.refresh();
    });
  }

  function handleHardDelete() {
    setDeleteMessage(null);
    setDeleteError(null);

    if (!selectedUserId) {
      setDeleteError("Selecione um usuario para excluir.");
      return;
    }

    if (!canDeleteSelectedUser) {
      setDeleteError("Esse usuario nao pode ser excluido por este perfil.");
      return;
    }

    const confirmed = window.confirm("Excluir este usuario definitivamente? Essa acao so funciona para usuarios sem historico operacional e nao pode ser desfeita.");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/users/${selectedUserId}?mode=hard`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setDeleteError(typeof payload.error === "string" ? payload.error : "Nao foi possivel excluir o usuario.");
        return;
      }

      setDeleteMessage(typeof payload.data?.message === "string" ? payload.data.message : "Usuario excluido definitivamente com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="grid gap-4 border border-slate-950 p-4">
        <div>
          <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Filtros</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Refine a lista por busca, papel, status ou inbox antes de editar.</p>
        </div>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Buscar</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou email"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Papel</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todos</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="AGENT">AGENT</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inbox</span>
          <select
            value={inboxFilter}
            onChange={(event) => setInboxFilter(event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todas</option>
            {inboxes.map((inbox) => (
              <option key={inbox.id} value={inbox.id}>{inbox.name}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Cobertura</span>
          <select
            value={coverageFilter}
            onChange={(event) => setCoverageFilter(event.target.value as InboxCoverageFilter)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="ALL">Todos</option>
            <option value="WITH_INBOX">Com inbox</option>
            <option value="WITHOUT_INBOX">Sem inbox</option>
          </select>
        </label>

        <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">
          {filteredCountLabel}
        </div>

        <div className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Lista visual</span>
          <div className="grid max-h-[320px] gap-2 overflow-y-auto border border-slate-950 bg-zinc-100 p-2">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-700">Nenhum usuario disponivel com os filtros atuais.</div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = user.id === selectedUserId;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserChange(user.id)}
                    className={`grid gap-2 border px-3 py-3 text-left transition-colors ${isSelected ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950 hover:bg-zinc-200"}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" className={isSelected ? "border-zinc-100" : ""} />
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm uppercase tracking-[0.18em]">{user.name}</p>
                        <p className={`truncate text-xs ${isSelected ? "text-zinc-300" : "text-slate-700"}`}>{user.email}</p>
                      </div>
                    </div>
                    <div className={`flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.18em] ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                      <span>{user.role}</span>
                      <span>{user.isActive ? "Ativo" : "Inativo"}</span>
                      <span>{user.inboxNames.length > 0 ? `${user.inboxNames.length} inbox` : "Sem inbox"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Usuario</span>
          <select
            value={selectedUserId}
            onChange={(event) => handleUserChange(event.target.value)}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {filteredUsers.length === 0 ? <option value="">Nenhum usuario encontrado</option> : null}
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.role}
              </option>
            ))}
          </select>
        </label>

        {selectedUser ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <UserAvatar name={selectedUser.name} avatarUrl={selectedUser.avatarUrl} size="md" />
              <div>
                <p className="font-heading text-sm uppercase tracking-[0.18em] text-slate-950">{selectedUser.name}</p>
                <p>{selectedUser.email}</p>
              </div>
            </div>
            <p><strong>Papel:</strong> {selectedUser.role}</p>
            <p><strong>Status:</strong> {selectedUser.isActive ? "Ativo" : "Inativo"}</p>
            <p><strong>Inboxes atuais:</strong> {selectedUser.inboxNames.length > 0 ? selectedUser.inboxNames.join(", ") : "Nenhuma"}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5">
        {!canEditSelectedUser && selectedUser ? (
          <div className="border border-slate-950 bg-zinc-100 px-4 py-4 text-sm leading-6 text-slate-700">
            O usuario selecionado e `ADMIN`. Apenas outro `ADMIN` pode editar dados, status, inboxes, foto ou redefinir a senha dele.
          </div>
        ) : null}

        <form onSubmit={handleSave} className="grid gap-5 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Editar usuario</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Atualize dados, papel, status e inboxes do usuario selecionado.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nome</span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                disabled={!canEditSelectedUser}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:opacity-60"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                disabled={!canEditSelectedUser}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:opacity-60"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Papel</span>
              <select
                value={form.role}
                onChange={(event) => updateField("role", event.target.value as UserRole)}
                disabled={!canEditSelectedUser}
                className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:opacity-60"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 border border-slate-950 px-4 py-3 text-sm text-slate-950">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                disabled={!canEditSelectedUser}
                className="h-4 w-4 border-slate-950"
              />
              <span>Usuario ativo</span>
            </label>
          </div>

          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Inboxes vinculadas</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inboxes.map((inbox) => {
                const checked = form.inboxIds.includes(inbox.id);

                return (
                  <label key={inbox.id} className={`flex items-center gap-3 border px-4 py-3 text-sm ${checked ? "border-slate-950 bg-slate-950 text-zinc-100" : "border-slate-950 bg-zinc-100 text-slate-950"} ${!canEditSelectedUser ? "opacity-60" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInbox(inbox.id)}
                      disabled={!canEditSelectedUser}
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
              disabled={isPending || !selectedUserId || !canEditSelectedUser}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </form>

        <form onSubmit={handleAvatarUpload} className="grid gap-4 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Foto do usuario</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Envie uma foto JPG, PNG ou WEBP de ate 2 MB para exibir junto do nome do usuario nos chamados e na timeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border border-slate-950 bg-zinc-100 px-4 py-4">
            <UserAvatar name={selectedUser?.name ?? "Usuario"} avatarUrl={selectedUser?.avatarUrl} size="lg" />
            <div className="grid gap-1 text-sm text-slate-700">
              <p><strong>Arquivo selecionado:</strong> {selectedAvatarLabel}</p>
              <p>Sem foto, o sistema usa as iniciais automaticamente.</p>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nova foto</span>
            <input
              key={avatarInputKey}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!canEditSelectedUser}
              onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
              className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 file:mr-4 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:font-heading file:text-xs file:uppercase file:tracking-[0.18em] file:text-zinc-100 disabled:opacity-60"
            />
          </label>

          {avatarFile ? (
            <div className="grid gap-4 border border-slate-950 bg-zinc-100 p-4 xl:grid-cols-[240px_minmax(0,1fr)]">
              <div className="grid gap-3">
                <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Preview com recorte</p>
                <div className="relative h-[208px] w-[208px] overflow-hidden border border-slate-950 bg-slate-950">
                  {avatarPreviewUrl && avatarPreviewLayout ? (
                    <div
                      aria-label="Preview do avatar"
                      className="absolute bg-no-repeat"
                      style={{
                        width: `${avatarPreviewLayout.drawWidth}px`,
                        height: `${avatarPreviewLayout.drawHeight}px`,
                        left: `${avatarPreviewLayout.drawX}px`,
                        top: `${avatarPreviewLayout.drawY}px`,
                        backgroundImage: `url(${avatarPreviewUrl})`,
                        backgroundSize: "100% 100%",
                      }}
                    />
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-slate-700">
                  O envio final respeita esse enquadramento quadrado.
                </p>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.01"
                    value={avatarCropScale}
                    onChange={(event) => setAvatarCropScale(Number(event.target.value))}
                    className="w-full accent-slate-950"
                  />
                  <span className="text-xs text-slate-700">{avatarCropScale.toFixed(2)}x</span>
                </label>

                <label className="grid gap-2">
                  <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Mover horizontal</span>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropX}
                    onChange={(event) => setAvatarCropX(Number(event.target.value))}
                    className="w-full accent-slate-950"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Mover vertical</span>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropY}
                    onChange={(event) => setAvatarCropY(Number(event.target.value))}
                    className="w-full accent-slate-950"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarCropScale(1);
                      setAvatarCropX(0);
                      setAvatarCropY(0);
                    }}
                    className="border border-slate-950 bg-zinc-100 px-4 py-3 font-heading text-xs uppercase tracking-[0.18em] text-slate-950"
                  >
                    Centralizar
                  </button>
                  <button
                    type="button"
                    onClick={resetAvatarDraft}
                    className="border border-slate-950 bg-zinc-100 px-4 py-3 font-heading text-xs uppercase tracking-[0.18em] text-slate-950"
                  >
                    Limpar selecao
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {avatarMessage ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{avatarMessage}</div> : null}
          {avatarError ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{avatarError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleAvatarRemoval}
              disabled={isPending || !selectedUserId || !selectedUser?.avatarUrl || !canEditSelectedUser}
              className="border border-slate-950 bg-zinc-100 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 disabled:opacity-50"
            >
              {isPending ? "Processando..." : "Remover foto"}
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedUserId || !avatarFile || !canEditSelectedUser}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Salvar foto"}
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordReset} className="grid gap-4 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Redefinir senha</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Defina uma nova senha para o usuario selecionado sem precisar recria-lo.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Nova senha</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              disabled={!canEditSelectedUser}
              className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none disabled:opacity-60"
            />
          </label>

          {passwordMessage ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{passwordMessage}</div> : null}
          {passwordError ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{passwordError}</div> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !selectedUserId || !canEditSelectedUser}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Redefinir senha"}
            </button>
          </div>
        </form>

        <div className="grid gap-4 border border-slate-950 p-4">
          <div>
            <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Arquivar ou excluir</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Arquivar desativa o acesso e preserva o historico. Excluir remove de vez apenas usuarios sem historico operacional.
            </p>
          </div>

          {!canDeleteSelectedUser && selectedUser?.id === currentUserId ? (
            <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-700">
              O proprio usuario logado nao pode ser arquivado nem excluido.
            </div>
          ) : null}

          {deleteMessage ? <div className="border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950">{deleteMessage}</div> : null}
          {deleteError ? <div className="border border-slate-950 bg-slate-950 px-4 py-3 text-sm text-zinc-100">{deleteError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleSoftDelete}
              disabled={isPending || !selectedUserId || !canDeleteSelectedUser}
              className="border border-slate-950 bg-zinc-100 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950 disabled:opacity-50"
            >
              {isPending ? "Processando..." : "Arquivar usuario"}
            </button>
            <button
              type="button"
              onClick={handleHardDelete}
              disabled={isPending || !selectedUserId || !canDeleteSelectedUser}
              className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100 disabled:opacity-50"
            >
              {isPending ? "Processando..." : "Excluir usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeCoverageFilter(value?: string): InboxCoverageFilter {
  if (value === "WITH_INBOX" || value === "WITHOUT_INBOX") {
    return value;
  }

  return "ALL";
}

function buildEditorState(user: UserInboxMembershipItem | null): UserEditorState {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "AGENT",
    isActive: user?.isActive ?? true,
    inboxIds: user?.inboxIds ?? [],
    password: "",
  };
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getCropLayout(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const baseScale = Math.max(targetSize / sourceWidth, targetSize / sourceHeight);
  const drawWidth = sourceWidth * baseScale * zoom;
  const drawHeight = sourceHeight * baseScale * zoom;
  const overflowX = Math.max(0, drawWidth - targetSize);
  const overflowY = Math.max(0, drawHeight - targetSize);
  const drawX = -overflowX / 2 + (offsetX / 100) * (overflowX / 2);
  const drawY = -overflowY / 2 + (offsetY / 100) * (overflowY / 2);

  return {
    drawWidth,
    drawHeight,
    drawX,
    drawY,
  };
}

async function buildCroppedAvatarFile(file: File, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_EXPORT_SIZE;
  canvas.height = AVATAR_EXPORT_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nao foi possivel preparar o recorte da imagem.");
  }

  const layout = getCropLayout(image.naturalWidth, image.naturalHeight, AVATAR_EXPORT_SIZE, zoom, offsetX, offsetY);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, layout.drawX, layout.drawY, layout.drawWidth, layout.drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png", 0.95);
  });

  if (!blob) {
    throw new Error("Nao foi possivel exportar o recorte da imagem.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${baseName}-cropped.png`, { type: "image/png" });
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Nao foi possivel ler a imagem selecionada."));
    };

    image.src = objectUrl;
  });
}





