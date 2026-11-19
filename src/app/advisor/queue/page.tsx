import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { getAdvisorApplicationCenterData } from "@/lib/advisor/queue-service";
import { AdvisorQueueView } from "@/components/advisor/advisor-queue-view";

export default async function AdvisorQueuePage() {
  const { user, profile } = await requireAdvisor("/advisor/queue");

  const initialData = await getAdvisorApplicationCenterData({
    advisorProfileId: profile.id,
  });

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorQueueView initialData={initialData} />
    </AppShell>
  );
}
