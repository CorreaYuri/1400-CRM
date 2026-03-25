"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ExitSupportModeButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      const response = await fetch("/api/tenants/support/exit", { method: "POST" });

      if (!response.ok) {
        return;
      }

      router.push("/tenants");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleExit}
      disabled={isPending}
      className="border border-amber-950/20 bg-amber-950 px-4 py-2 font-heading text-[0.64rem] uppercase tracking-[0.22em] text-amber-50 transition hover:bg-amber-900 disabled:opacity-50"
    >
      {isPending ? "Saindo..." : "Sair do modo suporte"}
    </button>
  );
}
