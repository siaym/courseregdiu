import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminPaymentClearanceView } from "@/components/admin/admin-payment-clearance-view";
import {
  listPaymentClearances,
  getPaymentAuditTrail,
} from "@/lib/payment/payment-service";

export default async function AdminPaymentsPage() {
  const { user, profile } = await requireAdmin("/admin/payments");

  const initialRecords = await listPaymentClearances("sem-spring-2027");
  const initialAudit = await getPaymentAuditTrail(undefined, "sem-spring-2027");

  return (
    <AppShell user={user} profile={profile}>
      <AdminPaymentClearanceView
        initialRecords={initialRecords}
        initialAudit={initialAudit}
        semesterId="sem-spring-2027"
      />
    </AppShell>
  );
}
