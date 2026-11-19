import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { AdvisingHistoryView } from "@/components/advisor/advising-history-view";

export default async function AdvisingHistoryPage() {
  const { user, profile } = await requireAdvisor("/advisor/history");

  return (
    <AppShell user={user} profile={profile}>
      <AdvisingHistoryView />
    </AppShell>
  );
}
