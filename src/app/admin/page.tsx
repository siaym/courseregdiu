import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { getBatchSemesterCourses } from "@/lib/curriculum/batch-course-service";
import { listPaymentClearances } from "@/lib/payment/payment-service";
import { getAllSystemSettings } from "@/lib/settings/system-settings";
import { MOCK_AUTHORIZED_EMAILS } from "@/lib/mock/data";

export default async function AdminPage() {
  const { user, profile } = await requireAdmin("/admin");

  // Fetch system settings for runtime feature toggles
  const systemSettings = await getAllSystemSettings();

  // Calculate live statistics
  const batches = ["69", "60", "70", "59"];
  let totalAssigned = 0;
  for (const b of batches) {
    const list = await getBatchSemesterCourses("sem-spring-2027", b);
    totalAssigned += list.length;
  }

  const payments = await listPaymentClearances("sem-spring-2027");
  const cleared = payments.filter((p) => p.status === "cleared").length;
  const awaiting = payments.filter((p) => p.status === "awaiting_verification").length;
  const notCleared = payments.filter((p) => p.status === "not_cleared").length;

  const stats = {
    totalConfiguredBatches: batches.length,
    totalAssignedCourses: totalAssigned,
    paymentClearanceCount: {
      cleared,
      awaiting,
      notCleared,
    },
    authorizedAlternativeEmails: MOCK_AUTHORIZED_EMAILS.length,
  };

  return (
    <AppShell user={user} profile={profile}>
      <AdminDashboardView stats={stats} systemSettings={systemSettings} />
    </AppShell>
  );
}
