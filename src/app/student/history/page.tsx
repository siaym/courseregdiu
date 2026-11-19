import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { AcademicHistoryView } from "@/components/student/academic-history-view";

export default async function StudentHistoryPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <AcademicHistoryView />
    </AppShell>
  );
}
