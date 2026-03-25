import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/modules/users/server/user-service";
import { requireApiRole } from "@/server/auth/session";

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um email valido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  inboxIds: z.array(z.string().trim().min(1)).default([]),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para criar o usuario." }, { status: 400 });
  }

  const result = await createUser(
    auth.session.user.tenantId,
    auth.session.user.id,
    auth.session.user.role,
    parsed.data,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
