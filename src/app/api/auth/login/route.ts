import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser } from "@/server/auth/auth-service";

const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1).optional(),
  email: z.string().email("Informe um email valido."),
  password: z.string().min(4, "Informe sua senha."),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de acesso invalidos." }, { status: 400 });
  }

  const result = await authenticateUser(parsed.data.email, parsed.data.password, parsed.data.tenantSlug);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
