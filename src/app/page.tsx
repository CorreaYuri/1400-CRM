import { TodayQueueView } from "@/modules/today/components/today-queue-view";
import { getTodayQueue } from "@/modules/today/server/today-service";
import { requirePageSession } from "@/server/auth/session";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await requirePageSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { items, filters, filterOptions, pagination } = await getTodayQueue(resolvedSearchParams, session.user.id);

  return <TodayQueueView items={items} filters={filters} filterOptions={filterOptions} pagination={pagination} />;
}
