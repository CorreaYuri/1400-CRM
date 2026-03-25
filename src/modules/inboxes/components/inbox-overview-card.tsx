type InboxOverviewCardProps = {
  name: string;
  waiting: number;
  assigned: number;
};

export function InboxOverviewCard({
  name,
  waiting,
  assigned,
}: InboxOverviewCardProps) {
  return (
    <article className="border border-zinc-100 bg-slate-950">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h3 className="font-heading text-xl uppercase tracking-[-0.05em]">{name}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Fila operacional do setor com visao de itens aguardando e em andamento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-100">
        <div className="bg-slate-950 px-5 py-4">
          <span className="block font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400">
            Na fila
          </span>
          <strong className="mt-3 block font-heading text-3xl uppercase tracking-[-0.06em]">
            {waiting}
          </strong>
        </div>

        <div className="bg-slate-950 px-5 py-4">
          <span className="block font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-400">
            Assumidos
          </span>
          <strong className="mt-3 block font-heading text-3xl uppercase tracking-[-0.06em]">
            {assigned}
          </strong>
        </div>
      </div>
    </article>
  );
}
