import type { AuditFilterOptions, AuditFilterState } from "@/modules/audit/server/audit-service";

type AuditFilterFormProps = {
  filters: AuditFilterState;
  options: AuditFilterOptions;
};

export function AuditFilterForm({ filters, options }: AuditFilterFormProps) {
  return (
    <form className="grid gap-4 border border-slate-950 p-4" method="GET" action="/auditoria">
      <div>
        <p className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Filtros</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Refine a trilha por entidade, acao, autor, periodo ou texto livre para localizar eventos mais rapido.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Busca</span>
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="Acao, entidade ou autor"
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Entidade</span>
          <select
            name="entityType"
            defaultValue={filters.entityType}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="">Todas</option>
            {options.entityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>{entityType}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Acao</span>
          <select
            name="action"
            defaultValue={filters.action}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="">Todas</option>
            {options.actions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Autor</span>
          <select
            name="actorId"
            defaultValue={filters.actorId}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="">Todos</option>
            {options.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>{actor.name} ({actor.email})</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">De</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-heading text-[0.64rem] uppercase tracking-[0.22em] text-zinc-500">Ate</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo}
            className="w-full border border-slate-950 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100"
        >
          Aplicar filtros
        </button>
        <a
          href="/auditoria"
          className="border border-slate-950 bg-zinc-100 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-slate-950"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
