import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { RegistrationTrackingView } from "@/components/student/registration-tracking-view";

export default async function StudentTrackingPage() {
  const { user, profile } = await requireOnboarded("/student/tracking");

  return (
    <AppShell user={user} profile={profile}>
      <RegistrationTrackingView />
    </AppShell>
  );
}
