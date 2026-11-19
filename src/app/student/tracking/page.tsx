import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { RegistrationTrackingView } from "@/components/student/registration-tracking-view";

export default async function StudentTrackingPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <AppShell user={user} profile={profile}>
      <RegistrationTrackingView />
    </AppShell>
  );
}
