import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ data: { ok: true } });
}
