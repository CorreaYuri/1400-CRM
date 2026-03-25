import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
};

export function Panel({ children, tone = "light", className = "" }: PanelProps) {
  const toneClass =
    tone === "dark"
      ? "overflow-hidden rounded-[0.78rem] border border-slate-950/90 bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.22),transparent_30%),linear-gradient(180deg,#020617_0%,#111827_52%,#050816_100%)] text-zinc-100 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
      : "crm-surface-card overflow-hidden rounded-[0.78rem] text-slate-950";

  return <section className={`${toneClass} ${className}`.trim()}>{children}</section>;
}
