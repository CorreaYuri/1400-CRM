import { NextResponse } from "next/server";
import { assumeTicket } from "@/modules/tickets/server/ticket-service";
import { requireApiSession } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const bodyText = await request.text();
  const body = bodyText ? (JSON.parse(bodyText) as { userId?: string }) : undefined;
  const { id } = await context.params;
  const result = await assumeTicket(id, session.user.id, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
