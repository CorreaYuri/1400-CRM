import { DashboardView } from "@/modules/dashboard/components/dashboard-view";
import { requirePageSession } from "@/server/auth/session";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requirePageSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedTicketId = typeof resolvedSearchParams?.ticket === "string" ? resolvedSearchParams.ticket : undefined;

  return <DashboardView selectedTicketId={selectedTicketId} actorUserId={session.user.id} />;
}
