"use client";

import { useMemo, useState, useTransition } from "react";

type PortalLinkCardProps = {
  portalUrl: string;
  isEnabled: boolean;
};

export function PortalLinkCard({ portalUrl, isEnabled }: PortalLinkCardProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resolvedPortalUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return portalUrl;
    }

    try {
      return new URL(portalUrl, window.location.origin).toString();
    } catch {
      return portalUrl;
    }
  }, [portalUrl]);

  function handleCopy() {
    startTransition(async () => {
      const textToCopy = resolvedPortalUrl;

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textToCopy);
          setMessage("Link copiado.");
          return;
        }

        throw new Error("Clipboard API indisponivel");
      } catch {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = textToCopy;
          textarea.setAttribute("readonly", "true");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const copied = document.execCommand("copy");
          document.body.removeChild(textarea);

          setMessage(copied ? "Link copiado." : "Copie manualmente o link exibido.");
        } catch {
          setMessage("Copie manualmente o link exibido.");
        }
      }
    });
  }

  return (
    <div className="border border-slate-900 bg-white/70 px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">Portal do solicitante</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Compartilhe este link para abertura publica de chamados neste tenant.
          </p>
        </div>
        <span
          className={`rounded-[0.58rem] border px-3 py-1.5 font-heading text-[0.58rem] uppercase tracking-[0.2em] ${
            isEnabled
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
        >
          {isEnabled ? "Ativo" : "Desabilitado"}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="overflow-x-auto rounded-[0.68rem] border border-slate-900/10 bg-slate-950 px-4 py-3 text-sm text-zinc-100">
          <code>{resolvedPortalUrl}</code>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isPending}
            className="crm-btn-secondary text-[0.62rem] disabled:opacity-60"
          >
            {isPending ? "Copiando..." : "Copiar link"}
          </button>
          <a href={resolvedPortalUrl} target="_blank" rel="noreferrer" className="crm-btn-primary text-[0.62rem]">
            Abrir portal
          </a>
        </div>

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        {!isEnabled ? (
          <p className="text-sm leading-6 text-slate-600">
            Para liberar esse portal, mantenha a origem <strong>Portal do solicitante</strong> habilitada nas regras do tenant.
          </p>
        ) : null}
      </div>
    </div>
  );
}
