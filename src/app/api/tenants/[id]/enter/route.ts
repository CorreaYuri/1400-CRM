import { NextResponse } from "next/server";
import { enterPlatformSupportTenant, requirePlatformApiSession } from "@/server/auth/platform-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requirePlatformApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const result = await enterPlatformSupportTenant(auth.session, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
