import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { getFormDataFiles } from "@/modules/tickets/server/attachment-storage";
import { addTicketInteraction } from "@/modules/tickets/server/ticket-service";
import { requireApiSession } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    const shouldReadJson = contentType.includes("application/json");
    const formData = shouldReadJson ? null : await request.formData().catch(() => null);
    const body = formData
      ? {
          type: String(formData.get("type") ?? "INTERNAL_NOTE"),
          content: String(formData.get("content") ?? ""),
        }
      : await request.json();
    const attachments = formData
      ? getFormDataFiles(formData, "attachments")
      : [];
    const result = await addTicketInteraction(id, body, session.user.id, attachments);

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
