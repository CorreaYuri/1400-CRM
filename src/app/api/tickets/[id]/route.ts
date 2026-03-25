import { NextResponse } from "next/server";
import { getTicketById } from "@/modules/tickets/server/ticket-service";
import { requireApiSession } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const ticket = await getTicketById(id, session.user.id);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ data: ticket });
}
