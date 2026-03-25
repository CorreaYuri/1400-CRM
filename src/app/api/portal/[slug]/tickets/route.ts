import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { createPortalTicket } from "@/modules/tickets/server/ticket-service";
import { getFormDataFiles } from "@/modules/tickets/server/attachment-storage";
import { db } from "@/server/db";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Portal do tenant nao encontrado." }, { status: 404 });
  }

  if (!tenant.isActive) {
    return NextResponse.json({ error: "Este tenant esta desativado e nao esta recebendo novos chamados." }, { status: 403 });
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
        }
      : await request.json();
    const attachments = formData
      ? getFormDataFiles(formData, "attachments")
      : [];
    const result = await createPortalTicket(slug, body, attachments);

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
