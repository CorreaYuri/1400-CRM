import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[1600px] place-items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="w-full max-w-3xl border border-slate-950 bg-zinc-100">
        <div className="border-b border-slate-950 px-5 py-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">
            Rota nao encontrada
          </p>
          <h1 className="mt-2 font-heading text-3xl uppercase tracking-[-0.06em] text-slate-950">
            Nada por aqui
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            A pagina solicitada nao existe ou foi movida. Voce pode voltar ao painel e seguir a navegacao principal.
          </p>
        </div>

        <div className="px-5 py-5">
          <Link href="/dashboard" className="inline-flex border border-slate-950 bg-slate-950 px-5 py-3 font-heading text-sm uppercase tracking-[0.22em] text-zinc-100">
            Abrir painel
          </Link>
        </div>
      </section>
    </main>
  );
}
