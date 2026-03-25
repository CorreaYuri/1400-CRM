"use client";

import { useEffect } from "react";
import { ErrorState } from "@/shared/components/error-state";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid min-h-[calc(100vh-2rem)] place-items-center">
        <div className="w-full max-w-4xl">
          <ErrorState
            eyebrow="Erro de aplicacao"
            title="Algo saiu do fluxo"
            description="A pagina encontrou uma falha inesperada. Voce pode tentar novamente agora ou voltar para o painel principal."
            primaryLabel="Tentar novamente"
            primaryAction={reset}
            secondaryHref="/dashboard"
            secondaryLabel="Voltar ao painel"
          />
        </div>
      </div>
    </main>
  );
}
