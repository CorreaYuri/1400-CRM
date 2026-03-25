import Link from "next/link";

type ErrorStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryAction?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: "light" | "dark";
};

export function ErrorState({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryAction,
  secondaryHref = "/dashboard",
  secondaryLabel = "Ir para o painel",
  tone = "light",
}: ErrorStateProps) {
  const isDark = tone === "dark";
  const containerClass = isDark
    ? "border border-zinc-100 bg-slate-950 text-zinc-100"
    : "border border-slate-950 bg-zinc-100 text-slate-950";
  const eyebrowClass = isDark ? "text-zinc-400" : "text-zinc-500";
  const titleClass = isDark ? "text-zinc-100" : "text-slate-950";
  const descriptionClass = isDark ? "text-zinc-300" : "text-slate-700";
  const primaryClass = isDark
    ? "border border-zinc-100 bg-zinc-100 text-slate-950"
    : "border border-slate-950 bg-slate-950 text-zinc-100";
  const secondaryClass = isDark
    ? "border border-zinc-100 text-zinc-100"
    : "border border-slate-950 text-slate-950";

  return (
    <section className={containerClass}>
      <div className="border-b border-current px-5 py-5">
        <p className={`font-heading text-[0.68rem] uppercase tracking-[0.28em] ${eyebrowClass}`}>
          {eyebrow}
        </p>
        <h1 className={`mt-2 font-heading text-3xl uppercase tracking-[-0.06em] ${titleClass}`}>
          {title}
        </h1>
        <p className={`mt-3 max-w-2xl text-sm leading-6 ${descriptionClass}`}>
          {description}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 px-5 py-5">
        {primaryLabel && primaryAction ? (
          <button
            type="button"
            onClick={primaryAction}
            className={`px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] ${primaryClass}`}
          >
            {primaryLabel}
          </button>
        ) : null}

        <Link href={secondaryHref} className={`px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] ${secondaryClass}`}>
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
