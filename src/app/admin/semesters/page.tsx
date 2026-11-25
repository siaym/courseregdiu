import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  SemesterManagementView,
  type SemesterWithStats,
} from "@/components/admin/semester-management-view";
import type { SemesterRow } from "@/lib/admin/admin-service";

export default async function AdminSemestersPage() {
  const { user, profile } = await requireAdmin("/admin/semesters");

  let semesters: SemesterWithStats[] = [];
  try {
    const supabase = await getSupabaseServerClient();
    const [semRes, asgRes, payRes, bscRes] = await Promise.all([
      supabase.from("semesters").select("*").order("year", { ascending: false }),
      supabase.from("advisor_assignments").select("semester_id").eq("is_active", true),
      supabase.from("payment_clearances").select("semester_id"),
      supabase.from("batch_semester_courses").select("semester_id"),
    ]);

    const asgCounts = new Map<string, number>();
    for (const r of (asgRes.data || []) as { semester_id: string }[]) {
      asgCounts.set(r.semester_id, (asgCounts.get(r.semester_id) || 0) + 1);
    }
    const payCounts = new Map<string, number>();
    for (const r of (payRes.data || []) as { semester_id: string }[]) {
      payCounts.set(r.semester_id, (payCounts.get(r.semester_id) || 0) + 1);
    }
    const bscCounts = new Map<string, number>();
    for (const r of (bscRes.data || []) as { semester_id: string }[]) {
      bscCounts.set(r.semester_id, (bscCounts.get(r.semester_id) || 0) + 1);
    }

    semesters = ((semRes.data || []) as SemesterRow[]).map((s) => ({
      ...s,
      assignmentCount: asgCounts.get(s.id) || 0,
      paymentCount: payCounts.get(s.id) || 0,
      courseConfigCount: bscCounts.get(s.id) || 0,
    }));
  } catch {
    // Graceful empty list
  }

  return (
    <AppShell user={user} profile={profile}>
      <SemesterManagementView semesters={semesters} />
    </AppShell>
  );
}
