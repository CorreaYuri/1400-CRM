import { ScheduleListView } from "@/modules/scheduling/components/schedule-list-view";
import { getSchedules } from "@/modules/scheduling/server/schedule-service";
import { requirePageSession } from "@/server/auth/session";

export default async function AgendamentosPage() {
  const session = await requirePageSession();
  const schedules = await getSchedules(session.user.id);

  return <ScheduleListView schedules={schedules} />;
}
