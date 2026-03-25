import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { getFormDataFiles } from "@/modules/tickets/server/attachment-storage";
import { createTicket, getTickets } from "@/modules/tickets/server/ticket-service";
import { requireApiSession } from "@/server/auth/session";

export async function GET() {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const tickets = await getTickets(undefined, session.user.id);
  return NextResponse.json({ data: tickets.items });
}

export async function POST(request: Request) {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const shouldReadJson = contentType.includes("application/json");
    const formData = shouldReadJson ? null : await request.formData().catch(() => null);
    const body = formData
      ? {
          customerName: String(formData.get("customerName") ?? ""),
          customerEmail: String(formData.get("customerEmail") ?? ""),
          customerPhone: String(formData.get("customerPhone") ?? ""),
          inboxId: String(formData.get("inboxId") ?? ""),
          subject: String(formData.get("subject") ?? ""),
          description: String(formData.get("description") ?? ""),
          priority: String(formData.get("priority") ?? "MEDIUM"),
          origin: String(formData.get("origin") ?? "INTERNAL"),
        }
      : await request.json();
    const attachments = formData
      ? getFormDataFiles(formData, "attachments")
      : [];
    const result = await createTicket(body, session.user.id, attachments);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ data: result.data }, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel processar o upload do anexo." },
      { status: 400 },
    );
  }
}
