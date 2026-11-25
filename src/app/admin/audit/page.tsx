import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuditLogsView } from "@/components/admin/audit-logs-view";
import type { AdminAuditLogRow } from "@/lib/admin/admin-service";

export default async function AdminAuditPage() {
  const { user, profile } = await requireAdmin("/admin/audit");

  let logs: AdminAuditLogRow[] = [];
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    logs = (data || []) as AdminAuditLogRow[];
  } catch {
    // Empty fallback
  }

  return (
    <AppShell user={user} profile={profile}>
      <AuditLogsView logs={logs} />
    </AppShell>
  );
}
