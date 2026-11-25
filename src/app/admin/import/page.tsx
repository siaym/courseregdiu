import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { RosterImportWizard } from "@/components/admin/roster-import-wizard";
import type {
  DepartmentRow,
  RosterImportRow,
  SemesterRow,
} from "@/lib/admin/admin-service";

export default async function AdminImportPage() {
  const { user, profile } = await requireAdmin("/admin/import");

  let semesters: SemesterRow[] = [];
  let departments: DepartmentRow[] = [];
  let recentImports: RosterImportRow[] = [];

  try {
    const supabase = await getSupabaseServerClient();
    const [semRes, deptRes, impRes] = await Promise.all([
      supabase.from("semesters").select("*").order("year", { ascending: false }),
      supabase.from("departments").select("*").order("code", { ascending: true }),
      supabase.from("advisor_roster_imports").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    semesters = (semRes.data || []) as SemesterRow[];
    departments = (deptRes.data || []) as DepartmentRow[];
    recentImports = (impRes.data || []) as RosterImportRow[];
  } catch {
    // Handled gracefully with empty lists
  }

  return (
    <AppShell user={user} profile={profile}>
      <RosterImportWizard
        semesters={semesters}
        departments={departments}
        recentImports={recentImports}
      />
    </AppShell>
  );
}
