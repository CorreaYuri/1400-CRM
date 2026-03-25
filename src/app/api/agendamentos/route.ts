import { NextResponse } from "next/server";
import { getSchedules } from "@/modules/scheduling/server/schedule-service";
import { requireApiSession } from "@/server/auth/session";

export async function GET() {
  const session = await requireApiSession();

  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const schedules = await getSchedules(session.user.id);
  return NextResponse.json({ data: schedules });
}
