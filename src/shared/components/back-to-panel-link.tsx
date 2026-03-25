import Link from "next/link";

type BackToPanelLinkProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackToPanelLink({ href = "/dashboard", label = "Voltar para o painel", className = "" }: BackToPanelLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-[0.62rem] border border-slate-900/10 bg-white/84 px-4 py-2 font-heading text-[0.64rem] uppercase tracking-[0.2em] text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.14)] transition-all hover:-translate-y-[1px] hover:bg-white",
        className,
      ].filter(Boolean).join(" ")}
    >
      <span aria-hidden="true" className="text-xs leading-none">&lt;</span>
      <span>{label}</span>
    </Link>
  );
}
