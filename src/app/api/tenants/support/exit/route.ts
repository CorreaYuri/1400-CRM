import { NextResponse } from "next/server";
import { exitPlatformSupportTenant, requirePlatformApiSession } from "@/server/auth/platform-access";

export async function POST() {
  const auth = await requirePlatformApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await exitPlatformSupportTenant(auth.session);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ data: result.data }, { status: result.status });
}
