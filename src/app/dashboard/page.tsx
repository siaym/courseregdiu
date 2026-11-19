import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { StudentHomeView } from "@/components/student/student-home-view";

export default async function DashboardPage() {
  const { user, profile } = await requireOnboarded("/dashboard");

  return (
    <AppShell user={user} profile={profile}>
      <StudentHomeView />
    </AppShell>
  );
}
