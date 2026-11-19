import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { WeeklyScheduleView } from "@/components/student/weekly-schedule-view";

export default async function SchedulePage() {
  const { user, profile } = await requireOnboarded("/schedule");

  return (
    <AppShell user={user} profile={profile}>
      <WeeklyScheduleView />
    </AppShell>
  );
}
