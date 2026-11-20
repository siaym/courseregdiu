import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { StudentHomeView } from "@/components/student/student-home-view";
import { getStudentPaymentClearance } from "@/lib/payment/payment-service";
import { MOCK_CURRENT_SEMESTER } from "@/lib/mock/data";

export default async function DashboardPage() {
  const { user, profile } = await requireOnboarded("/dashboard");

  const paymentClearance = await getStudentPaymentClearance(profile.id, MOCK_CURRENT_SEMESTER.id);

  return (
    <AppShell user={user} profile={profile}>
      <StudentHomeView profile={profile} paymentClearance={paymentClearance} />
    </AppShell>
  );
}
