import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { UnifiedCoursesWorkspace } from "@/components/student/unified-courses-workspace";

export default async function CoursesPage() {
  const { user, profile } = await requireOnboarded("/courses");

  let activeRegistration = null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("diu_student_active_registration")?.value;
    if (raw) {
      activeRegistration = JSON.parse(raw);
    }
  } catch {
    // ignore parse error
  }

  return (
    <AppShell user={user} profile={profile}>
      <UnifiedCoursesWorkspace
        initialProfile={profile}
        initialActiveRegistration={activeRegistration}
      />
    </AppShell>
  );
}
