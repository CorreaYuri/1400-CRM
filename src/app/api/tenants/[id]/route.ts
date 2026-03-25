import { NextResponse } from "next/server";
import { deleteTenant, setTenantActiveStatus } from "@/modules/tenants/server/tenant-management-service";
import { requirePlatformApiSession } from "@/server/auth/platform-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requirePlatformApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json()) as { isActive?: boolean };

  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Informe o status desejado para o tenant." }, { status: 400 });
  }

  const result = await setTenantActiveStatus(id, auth.session.user.id, body.isActive, auth.session.user.tenantId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requirePlatformApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await deleteTenant(id, auth.session.user.id, auth.session.user.tenantId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
