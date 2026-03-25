import { NextResponse } from "next/server";
import { processEmailNotificationQueue } from "@/modules/tickets/server/ticket-email-notifications";
import { env } from "@/server/env";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  if (!env.INTERNAL_CRON_SECRET) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${env.INTERNAL_CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const result = await processEmailNotificationQueue({ limit: 10 });
  return NextResponse.json(result);
}
