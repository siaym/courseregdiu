import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { UnifiedCoursesWorkspace } from "@/components/student/unified-courses-workspace";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <UnifiedCoursesWorkspace />
    </AppShell>
  );
}
