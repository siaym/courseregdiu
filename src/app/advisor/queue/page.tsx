import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { AdvisorDashboardView } from "@/components/advisor/advisor-dashboard-view";

export default async function AdvisorQueuePage() {
  const { user, profile } = await requireAdvisor("/advisor/queue");

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorDashboardView />
    </AppShell>
  );
}
