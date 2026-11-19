import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { AdvisorProfileView } from "@/components/advisor/advisor-profile-view";

export default async function AdvisorProfilePage() {
  const { user, profile } = await requireAdvisor("/advisor/profile");

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorProfileView />
    </AppShell>
  );
}
