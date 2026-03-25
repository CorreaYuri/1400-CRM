"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="crm-btn-secondary text-[0.6rem] disabled:opacity-50"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
