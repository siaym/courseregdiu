import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { AdvisorProfileView } from "@/components/advisor/advisor-profile-view";

export default async function AdvisorProfilePage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorProfileView />
    </AppShell>
  );
}
