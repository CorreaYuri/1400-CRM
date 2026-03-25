"use client";

import { useEffect } from "react";
import { ErrorState } from "@/shared/components/error-state";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 px-4 py-4 text-zinc-100 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] place-items-center">
          <div className="w-full max-w-4xl">
            <ErrorState
              eyebrow="Falha global"
              title="O sistema encontrou um erro critico"
              description="A aplicacao nao conseguiu concluir esta requisicao. Tente recarregar o fluxo ou retorne ao painel quando o sistema estabilizar."
              primaryLabel="Tentar novamente"
              primaryAction={reset}
              secondaryHref="/dashboard"
              secondaryLabel="Ir para o painel"
              tone="dark"
            />
          </div>
        </div>
      </body>
    </html>
  );
}
