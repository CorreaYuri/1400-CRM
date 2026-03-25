"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChildTicketSummary } from "@/modules/tickets/server/types";

type ChildTicketsModalButtonProps = {
  tickets: ChildTicketSummary[];
};

export function ChildTicketsModalButton({ tickets }: ChildTicketsModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="crm-btn-secondary text-[0.62rem]"
      >
        {tickets.length > 0 ? `Chamados filhos ${String(tickets.length).padStart(2, "0")}` : "Ver chamados filhos"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[0.78rem] border border-white/10 bg-[linear-gradient(180deg,#020617_0%,#111827_52%,#050816_100%)] text-zinc-100 shadow-[0_30px_80px_rgba(15,23,42,0.4)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-heading text-[0.58rem] uppercase tracking-[0.22em] text-zinc-500">Chamados filhos</p>
                <p className="mt-1 text-sm text-zinc-300">
                  {tickets.length > 0 ? `${tickets.length} chamado(s) derivado(s) deste atendimento.` : "Nenhum chamado filho aberto ate o momento."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.58rem] uppercase tracking-[0.2em] text-zinc-200 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className="crm-scroll max-h-[70vh] overflow-y-auto px-5 py-4">
              {tickets.length === 0 ? (
                <div className="rounded-[0.66rem] border border-white/10 bg-white/4 px-4 py-4 text-sm leading-6 text-zinc-300">
                  Nenhum chamado filho foi aberto a partir deste atendimento.
                </div>
              ) : (
                <div className="grid gap-3">
                  {tickets.map((childTicket) => (
                    <div key={childTicket.id} className="grid gap-4 rounded-[0.66rem] border border-white/10 bg-white/4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-300">
                            {childTicket.id}
                          </span>
                          <span className="rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-300">
                            {childTicket.status}
                          </span>
                          <span className="rounded-[0.58rem] border border-white/10 bg-white/6 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.2em] text-zinc-300">
                            {childTicket.inbox}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-zinc-300">{childTicket.subject}</p>
                      </div>

                      <Link href={`/tickets/${childTicket.id}`} className="crm-btn-secondary text-[0.62rem]" onClick={() => setIsOpen(false)}>
                        Abrir filho
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
