import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { AdviseeRosterView } from "@/components/advisor/advisee-roster-view";

export default async function AdviseeRosterPage() {
  const { user, profile } = await requireAdvisor("/advisor/students");

  return (
    <AppShell user={user} profile={profile}>
      <AdviseeRosterView />
    </AppShell>
  );
}
