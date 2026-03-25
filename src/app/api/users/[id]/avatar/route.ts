import { NextResponse } from "next/server";
import { removeUserAvatar, updateUserAvatar } from "@/modules/users/server/user-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    return NextResponse.json({ error: "Envie uma imagem valida para o avatar." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await updateUserAvatar(
    auth.session.user.tenantId,
    auth.session.user.id,
    auth.session.user.role,
    id,
    avatar,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const result = await removeUserAvatar(
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
