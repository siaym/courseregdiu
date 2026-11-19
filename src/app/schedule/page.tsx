import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { WeeklyScheduleView } from "@/components/student/weekly-schedule-view";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <WeeklyScheduleView />
    </AppShell>
  );
}
