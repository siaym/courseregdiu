import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { AdviseeRosterView } from "@/components/advisor/advisee-roster-view";

export default async function AdviseeRosterPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <AdviseeRosterView />
    </AppShell>
  );
}
