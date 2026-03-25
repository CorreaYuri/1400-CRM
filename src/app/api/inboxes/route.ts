import { NextResponse } from "next/server";
import { z } from "zod";
import { createInbox, getInboxes } from "@/modules/inboxes/server/inbox-service";
import { requireApiRole, requireApiSession } from "@/server/auth/session";

const manageInboxSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da inbox."),
  code: z.string().trim().min(2, "Informe o codigo da inbox.").max(12, "Use um codigo curto para a inbox."),
  description: z.string().trim().max(240, "Use uma descricao mais curta.").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  firstResponseSlaMinutes: z.number().int().positive("Informe um SLA valido em minutos.").nullable().optional(),
  resolutionSlaHours: z.number().int().positive("Informe um SLA valido em horas.").nullable().optional(),
});

export async function GET() {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const inboxes = await getInboxes(session.user.id);
  return NextResponse.json({ data: inboxes });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = manageInboxSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para criar a inbox." }, { status: 400 });
  }

  const result = await createInbox(auth.session.user.tenantId, auth.session.user.id, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
