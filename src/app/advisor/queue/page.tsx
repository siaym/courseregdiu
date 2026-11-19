import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { AdvisorDashboardView } from "@/components/advisor/advisor-dashboard-view";

export default async function AdvisorQueuePage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorDashboardView />
    </AppShell>
  );
}
