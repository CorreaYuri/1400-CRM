import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUserInboxMemberships } from "@/modules/users/server/user-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateUserInboxesSchema = z.object({
  inboxIds: z.array(z.string().trim().min(1)).default([]),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = updateUserInboxesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para atualizar as inboxes." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateUserInboxMemberships(auth.session.user.tenantId, id, parsed.data.inboxIds);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
