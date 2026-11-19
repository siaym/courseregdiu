import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { StudentHomeView } from "@/components/student/student-home-view";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <StudentHomeView />
    </AppShell>
  );
}
