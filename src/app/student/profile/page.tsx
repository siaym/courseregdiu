import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { StudentProfileView } from "@/components/student/student-profile-view";

export default async function StudentProfilePage() {
  const { user, profile } = await requireOnboarded("/student/profile");

  return (
    <AppShell user={user} profile={profile}>
      <StudentProfileView />
    </AppShell>
  );
}
