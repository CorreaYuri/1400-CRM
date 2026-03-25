import { z } from "zod";

const requesterFieldsSchema = {
  customerName: z.string().trim().min(2, "Informe o nome do solicitante."),
  customerEmail: z.union([z.string().trim().email("Informe um email valido."), z.literal("")]).optional(),
  customerPhone: z.union([z.string().trim().min(8, "Informe um telefone valido."), z.literal("")]).optional(),
  inboxId: z.string().trim().min(1, "Selecione a inbox."),
  subject: z.string().trim().min(4, "Informe um assunto mais completo."),
  description: z.string().trim().min(10, "Descreva melhor o chamado."),
} as const;

export const createTicketSchema = z.object({
  ...requesterFieldsSchema,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  origin: z.enum(["INTERNAL", "CUSTOMER_PORTAL", "EMAIL", "WHATSAPP", "API"]),
});

export const publicCreateTicketSchema = z.object(requesterFieldsSchema);

export const addTicketInteractionSchema = z.object({
  type: z.enum(["INTERNAL_NOTE", "CUSTOMER_MESSAGE", "AGREEMENT"]),
  content: z.string().trim().min(3, "Escreva uma interacao com mais contexto."),
});

export const scheduleTicketSchema = z.object({
  dueAt: z.string().trim().min(1, "Informe data e hora para o reagendamento."),
  reason: z.string().trim().min(4, "Explique o motivo do reagendamento."),
});

export const createChildTicketSchema = z.object({
  inboxId: z.string().trim().min(1, "Selecione a inbox de destino."),
  subject: z.string().trim().min(4, "Informe um assunto mais completo para o chamado filho."),
  description: z.string().trim().min(10, "Descreva o contexto que sera enviado para a outra inbox."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const transferTicketSchema = z.object({
  inboxId: z.string().trim().min(1, "Selecione a inbox de destino."),
  reason: z.string().trim().min(4, "Explique o motivo da transferencia."),
});

export const assignTicketSchema = z.object({
  userId: z.string().trim().min(1, "Selecione o integrante que vai receber o chamado.").optional(),
});

export const closeTicketSchema = z.object({
  reason: z.string().trim().min(3, "Selecione um motivo de encerramento."),
  resolutionSummary: z.string().trim().max(2000, "O resumo da solucao ficou muito longo.").optional().or(z.literal("")),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type PublicCreateTicketInput = z.infer<typeof publicCreateTicketSchema>;
export type AddTicketInteractionInput = z.infer<typeof addTicketInteractionSchema>;
export type ScheduleTicketInput = z.infer<typeof scheduleTicketSchema>;
export type CreateChildTicketInput = z.infer<typeof createChildTicketSchema>;
export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type CloseTicketInput = z.infer<typeof closeTicketSchema>;
