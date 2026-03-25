type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  tone?: "light" | "dark";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  tone = "light",
  className = "",
}: SectionHeaderProps) {
  const eyebrowClass = tone === "dark" ? "text-zinc-400" : "text-slate-500";
  const titleClass = tone === "dark" ? "text-zinc-100" : "text-slate-950";

  return (
    <div className={className}>
      <p className={`font-heading text-[0.62rem] uppercase tracking-[0.28em] ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h3 className={`mt-2 font-heading text-[2rem] uppercase tracking-[-0.07em] ${titleClass} sm:text-[2.35rem]`}>
        {title}
      </h3>
    </div>
  );
}
