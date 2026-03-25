import { NextResponse } from "next/server";
import { z } from "zod";
import { updateInboxMemberships } from "@/modules/inboxes/server/inbox-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateInboxMembersSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).default([]),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = updateInboxMembersSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para atualizar os membros da inbox." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateInboxMemberships(auth.session.user.tenantId, auth.session.user.id, id, parsed.data.userIds);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
