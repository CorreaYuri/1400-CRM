import { NextResponse } from "next/server";
import { z } from "zod";
import { hardDeleteUser, softDeleteUser, updateUser } from "@/modules/users/server/user-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um email valido."),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  isActive: z.boolean(),
  inboxIds: z.array(z.string().trim().min(1)).default([]),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para atualizar o usuario." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateUser(
    auth.session.user.tenantId,
    auth.session.user.id,
    auth.session.user.role,
    id,
    parsed.data,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const mode = new URL(request.url).searchParams.get("mode");
  const result = mode === "hard"
    ? await hardDeleteUser(
      auth.session.user.tenantId,
      auth.session.user.id,
      auth.session.user.role,
      id,
    )
    : await softDeleteUser(
      auth.session.user.tenantId,
      auth.session.user.id,
      auth.session.user.role,
      id,
    );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
