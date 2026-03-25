import { NextResponse } from "next/server";
import { exportOperationalReportCsv } from "@/modules/reports/server/report-service";
import { requireApiRole } from "@/server/auth/session";

export async function GET(request: Request) {
  const auth = await requireApiRole(["ADMIN", "MANAGER"]);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const csv = await exportOperationalReportCsv(auth.session.user.tenantId, {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });

  return new NextResponse(csv.content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csv.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
