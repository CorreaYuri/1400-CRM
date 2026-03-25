import { NextResponse } from "next/server";
import { readTicketAttachmentFile } from "@/modules/tickets/server/attachment-storage";
import { canOperateInbox, resolveAccessActor } from "@/server/auth/access";
import { requireApiSession } from "@/server/auth/session";
import { db } from "@/server/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession();

    if (!session) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const actor = await resolveAccessActor(session.user.id);

    if (!actor) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
    }

    const { attachmentId } = await context.params;
    const attachment = await db.ticketAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        originalName: true,
        fileUrl: true,
        contentType: true,
        ticket: {
          select: {
            tenantId: true,
            inboxId: true,
            childRelations: {
              where: { type: "CHILD" },
              select: {
                parentTicket: {
                  select: {
                    inboxId: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!attachment || attachment.ticket.tenantId !== actor.tenantId) {
      return NextResponse.json({ error: "Anexo nao encontrado." }, { status: 404 });
    }

    const canDirectOperate = await canOperateInbox(actor, attachment.ticket.inboxId);
    const parentInboxId = attachment.ticket.childRelations[0]?.parentTicket.inboxId ?? null;
    const canViewViaParent = parentInboxId ? await canOperateInbox(actor, parentInboxId) : false;

    if (!canDirectOperate && !canViewViaParent) {
      return NextResponse.json({ error: "Voce nao pode acessar este anexo." }, { status: 403 });
    }

    try {
      const fileBuffer = await readTicketAttachmentFile(attachment.fileUrl);
      const encodedFilename = encodeURIComponent(attachment.originalName);

      return new Response(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": attachment.contentType || "application/octet-stream",
          "Content-Length": String(fileBuffer.byteLength),
          "Cache-Control": "private, no-store, max-age=0",
          "Content-Disposition": `attachment; filename="anexo"; filename*=UTF-8''${encodedFilename}`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Arquivo do anexo nao encontrado." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao baixar o anexo." },
      { status: 500 },
    );
  }
}
