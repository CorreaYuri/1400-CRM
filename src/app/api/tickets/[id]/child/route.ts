import { NextResponse } from "next/server";
import { createChildTicket } from "@/modules/tickets/server/ticket-service";
import { requireApiSession } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const result = await createChildTicket(id, body, session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
