import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantLogoFile, removeTenantLogoFile, saveTenantLogo } from "@/modules/tenants/server/tenant-logo-storage";
import { getTenantSettingsOverview, updateTenantSettings } from "@/modules/tenants/server/tenant-settings-service";
import { requireApiRole } from "@/server/auth/session";

export const runtime = "nodejs";

const updateTenantSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome valido."),
  slug: z.string().trim().min(3, "Informe um slug valido."),
  notificationSenderName: z.string().trim().max(80, "Informe um nome menor para o remetente.").optional(),
  notificationSenderEmail: z.union([z.string().trim().email("Informe um email valido para o remetente."), z.literal("")]).optional(),
  defaultTicketPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  allowedTicketOrigins: z.array(z.enum(["INTERNAL", "CUSTOMER_PORTAL", "EMAIL", "WHATSAPP", "API"]))
    .min(1, "Selecione ao menos uma origem."),
  closureReasons: z.array(z.string().trim().min(3)).default([]),
  removeLogo: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole("ADMIN");

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const currentTenant = await getTenantSettingsOverview(auth.session.user.tenantId);

  if (!currentTenant) {
    return NextResponse.json({ error: "Tenant nao encontrado." }, { status: 404 });
  }

  let savedLogoUrl: string | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const shouldReadJson = contentType.includes("application/json");
    const formData = shouldReadJson ? null : await request.formData().catch(() => null);

    const rawBody = formData
      ? {
          name: String(formData.get("name") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          notificationSenderName: String(formData.get("notificationSenderName") ?? ""),
          notificationSenderEmail: String(formData.get("notificationSenderEmail") ?? ""),
          defaultTicketPriority: String(formData.get("defaultTicketPriority") ?? "MEDIUM"),
          allowedTicketOrigins: JSON.parse(String(formData.get("allowedTicketOrigins") ?? "[]")),
          closureReasons: JSON.parse(String(formData.get("closureReasons") ?? "[]")),
          removeLogo: String(formData.get("removeLogo") ?? "false") === "true",
        }
      : await request.json();

    const parsed = updateTenantSettingsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos para atualizar o tenant." }, { status: 400 });
    }

    if (formData) {
      const logoFile = getTenantLogoFile(formData, "logoFile");

      if (logoFile) {
        savedLogoUrl = await saveTenantLogo(logoFile);
      }
    }

    const nextLogoUrl = parsed.data.removeLogo ? "" : savedLogoUrl ?? currentTenant.logoUrl ?? "";
    const result = await updateTenantSettings(auth.session.user.tenantId, auth.session.user.id, {
      ...parsed.data,
      logoUrl: nextLogoUrl,
    });

    if (!result.ok) {
      await removeTenantLogoFile(savedLogoUrl);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (parsed.data.removeLogo || savedLogoUrl) {
      await removeTenantLogoFile(currentTenant.logoUrl);
    }

    return NextResponse.json({ data: result.data }, { status: result.status });
  } catch (error) {
    await removeTenantLogoFile(savedLogoUrl);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel atualizar o tenant." },
      { status: 400 },
    );
  }
}
