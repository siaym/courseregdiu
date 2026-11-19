import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { AcademicHistoryView } from "@/components/student/academic-history-view";

export default async function StudentHistoryPage() {
  const { user, profile } = await requireOnboarded("/student/history");

  return (
    <AppShell user={user} profile={profile}>
      <AcademicHistoryView />
    </AppShell>
  );
}
