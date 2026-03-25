import { getTickets } from "@/modules/tickets/server/ticket-service";
import { TicketListView } from "@/modules/tickets/components/ticket-list-view";
import { requirePageSession } from "@/server/auth/session";

type TicketsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await requirePageSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { items, filters, filterOptions, pagination } = await getTickets(resolvedSearchParams, session.user.id);

  return <TicketListView tickets={items} filters={filters} filterOptions={filterOptions} pagination={pagination} />;
}
