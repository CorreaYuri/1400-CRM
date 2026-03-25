import { NextResponse } from "next/server";
import { z } from "zod";
import { resetUserPassword } from "@/modules/users/server/user-service";
import { requireApiRole } from "@/server/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const resetPasswordSchema = z.object({
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para redefinir a senha." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await resetUserPassword(
    auth.session.user.tenantId,
    auth.session.user.id,
    auth.session.user.role,
    id,
    parsed.data.password,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
