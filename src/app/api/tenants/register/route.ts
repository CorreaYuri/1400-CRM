import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantLogoFile, removeTenantLogoFile, saveTenantLogo } from "@/modules/tenants/server/tenant-logo-storage";
import { registerTenant } from "@/modules/tenants/server/tenant-service";
import { isPlatformAdminSession } from "@/server/auth/platform-access";
import { requireApiSession } from "@/server/auth/session";

export const runtime = "nodejs";

const extraUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um email valido."),
  password: z.string().min(6, "A senha do usuario precisa ter pelo menos 6 caracteres."),
  role: z.enum(["MANAGER", "AGENT"]),
  inboxCodes: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos uma inbox para o usuario."),
});

const registerTenantSchema = z.object({
  tenantName: z.string().trim().min(2, "Informe o nome da empresa."),
  tenantSlug: z.string().trim().min(3, "Informe um identificador para o tenant."),
  adminName: z.string().trim().min(2, "Informe o nome do administrador."),
  adminEmail: z.string().trim().email("Informe um email valido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  inboxCodes: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos uma inbox inicial."),
  extraUsers: z.array(extraUserSchema).default([]),
  preservePlatformSession: z.boolean().optional(),
});

export async function POST(request: Request) {
  let savedLogoUrl: string | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const shouldReadJson = contentType.includes("application/json");
    const formData = shouldReadJson ? null : await request.formData().catch(() => null);

    const rawBody = formData
      ? {
          tenantName: String(formData.get("tenantName") ?? ""),
          tenantSlug: String(formData.get("tenantSlug") ?? ""),
          adminName: String(formData.get("adminName") ?? ""),
          adminEmail: String(formData.get("adminEmail") ?? ""),
          password: String(formData.get("password") ?? ""),
          inboxCodes: JSON.parse(String(formData.get("inboxCodes") ?? "[]")),
          extraUsers: JSON.parse(String(formData.get("extraUsers") ?? "[]")),
          preservePlatformSession: String(formData.get("preservePlatformSession") ?? "false") === "true",
        }
      : await request.json();

    const parsed = registerTenantSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos para cadastrar o tenant." }, { status: 400 });
    }

    if (formData) {
      const logoFile = getTenantLogoFile(formData, "logoFile");

      if (logoFile) {
        savedLogoUrl = await saveTenantLogo(logoFile);
      }
    }

    const session = await requireApiSession();
    const preservePlatformSession = parsed.data.preservePlatformSession === true;
    const canPreservePlatformSession = preservePlatformSession && session && isPlatformAdminSession(session);

    if (preservePlatformSession && !canPreservePlatformSession) {
      await removeTenantLogoFile(savedLogoUrl);
      return NextResponse.json({ error: "Somente a equipe da plataforma pode preservar a sessao ao criar tenant." }, { status: 403 });
    }

    const result = await registerTenant(
      {
        ...parsed.data,
        ...(savedLogoUrl ? { logoUrl: savedLogoUrl } : {}),
      },
      {
        signInAfterCreate: !canPreservePlatformSession,
      },
    );

    if (!result.ok) {
      await removeTenantLogoFile(savedLogoUrl);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ data: result.data }, { status: result.status });
  } catch (error) {
    await removeTenantLogoFile(savedLogoUrl);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel cadastrar o tenant." },
      { status: 400 },
    );
  }
}
