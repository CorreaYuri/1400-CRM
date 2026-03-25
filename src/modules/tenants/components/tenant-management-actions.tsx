"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TenantManagementActionsProps = {
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  isCurrentTenant: boolean;
};

export function TenantManagementActions({ tenantId, tenantName, isActive, isCurrentTenant }: TenantManagementActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(nextIsActive: boolean) {
    if (isCurrentTenant) {
      return;
    }

    const confirmed = window.confirm(
      nextIsActive
        ? `Reativar o tenant ${tenantName}?`
        : `Desativar o tenant ${tenantName}? Usuarios deste tenant nao conseguirao mais entrar nem abrir chamados pelo portal.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel atualizar o tenant.");
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    if (isCurrentTenant) {
      return;
    }

    const confirmed = window.confirm(
      `Apagar o tenant ${tenantName}? Esta acao remove usuarios, inboxes, chamados e auditoria vinculados a ele.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Nao foi possivel apagar o tenant.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={() => handleStatusChange(false)}
            disabled={isPending || isCurrentTenant}
            className="border border-slate-950/16 bg-white/80 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-slate-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleStatusChange(true)}
            disabled={isPending || isCurrentTenant}
            className="border border-emerald-300/60 bg-emerald-50 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-emerald-950 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          >
            Reativar
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending || isCurrentTenant}
          className="border border-rose-300/70 bg-rose-50 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-rose-950 transition-colors hover:bg-rose-100 disabled:opacity-50"
        >
          Apagar
        </button>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
