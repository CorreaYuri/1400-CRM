import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveInbox, updateInbox } from "@/modules/inboxes/server/inbox-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const manageInboxSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da inbox."),
  code: z.string().trim().min(2, "Informe o codigo da inbox.").max(12, "Use um codigo curto para a inbox."),
  description: z.string().trim().max(240, "Use uma descricao mais curta.").optional().or(z.literal("")),
  isActive: z.boolean(),
  firstResponseSlaMinutes: z.number().int().positive("Informe um SLA valido em minutos.").nullable().optional(),
  resolutionSlaHours: z.number().int().positive("Informe um SLA valido em horas.").nullable().optional(),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = manageInboxSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para atualizar a inbox." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateInbox(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const result = await archiveInbox(auth.session.user.tenantId, auth.session.user.id, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
