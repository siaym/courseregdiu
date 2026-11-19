import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { AdvisingHistoryView } from "@/components/advisor/advising-history-view";

export default async function AdvisingHistoryPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <AdvisingHistoryView />
    </AppShell>
  );
}
