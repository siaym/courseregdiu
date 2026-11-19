import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { StudentProfileView } from "@/components/student/student-profile-view";

export default async function StudentProfilePage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <StudentProfileView />
    </AppShell>
  );
}
