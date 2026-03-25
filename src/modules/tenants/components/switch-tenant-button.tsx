"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type SwitchTenantButtonProps = {
  tenantId: string;
};

export function SwitchTenantButton({ tenantId }: SwitchTenantButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch() {
    startTransition(async () => {
      const response = await fetch(`/api/tenants/${tenantId}/enter`, { method: "POST" });

      if (!response.ok) {
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={isPending}
      className="crm-btn-primary text-[0.68rem] disabled:opacity-50"
    >
      {isPending ? "Entrando..." : "Entrar como suporte"}
    </button>
  );
}
