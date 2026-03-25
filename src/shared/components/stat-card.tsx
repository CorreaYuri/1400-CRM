type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] px-4 py-4 sm:px-4 sm:py-4.5">
      <span className="inline-flex rounded-[0.55rem] border border-slate-200 bg-white/92 px-2.5 py-1 font-heading text-[0.56rem] uppercase tracking-[0.2em] text-slate-600 shadow-[0_6px_16px_rgba(148,163,184,0.14)]">
        {label}
      </span>
      <strong className="mt-2.5 block font-heading text-2xl uppercase tracking-[-0.07em] text-slate-950 sm:text-3xl">
        {value}
      </strong>
      <p className="mt-1.5 max-w-xs text-sm leading-5 text-slate-600">{detail}</p>
    </article>
  );
}
