import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { StudentAssignmentsView } from "@/components/admin/student-assignments-view";
import type { StudentAssignmentOverviewRow } from "@/app/admin/assignments/actions";
import type {
  AdvisorProfileRow,
  DepartmentRow,
  SemesterRow,
} from "@/lib/admin/admin-service";

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string; filter?: string; batch?: string }> | {
    semester?: string;
    filter?: string;
    batch?: string;
  };
}) {
  const { user, profile } = await requireAdmin("/admin/assignments");
  const resolved = searchParams ? await searchParams : {};

  let available = true;
  let errorMessage: string | undefined;
  let semesters: SemesterRow[] = [];
  let departments: DepartmentRow[] = [];
  let advisors: AdvisorProfileRow[] = [];
  let rows: StudentAssignmentOverviewRow[] = [];
  let selectedSemesterId = "";

  try {
    const supabase = await getSupabaseServerClient();
    const [semRes, deptRes, advRes, stuRes] = await Promise.all([
      supabase.from("semesters").select("*").order("year", { ascending: false }),
      supabase.from("departments").select("*").order("code", { ascending: true }),
      supabase.from("advisor_profiles").select("*").order("full_name", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, diu_id, full_name, email, batch, department_code")
        .eq("role", "student")
        .order("diu_id", { ascending: true }),
    ]);

    if (semRes.error || advRes.error || stuRes.error) {
      available = false;
      errorMessage =
        semRes.error?.message || advRes.error?.message || stuRes.error?.message || "Database error.";
    } else {
      semesters = (semRes.data || []) as SemesterRow[];
      departments = (deptRes.data || []) as DepartmentRow[];
      advisors = (advRes.data || []) as AdvisorProfileRow[];

      const activeSem = semesters.find((s) => s.is_active) || semesters[0];
      selectedSemesterId = resolved.semester || activeSem?.id || "";

      const advById = new Map<string, AdvisorProfileRow>();
      const advByProfileId = new Map<string, AdvisorProfileRow>();
      for (const a of advisors) {
        advById.set(a.id, a);
        if (a.profile_id) advByProfileId.set(a.profile_id, a);
      }

      const assignmentsRes = selectedSemesterId
        ? await supabase
            .from("advisor_assignments")
            .select("*")
            .eq("semester_id", selectedSemesterId)
            .eq("is_active", true)
        : { data: [], error: null };

      const assignmentsByStudent = new Map<
        string,
        {
          id: string;
          advisor_profile_id: string | null;
          advisor_id: string | null;
          assignment_source?: string;
          assignment_rule_type?: string;
          source_range_raw?: string | null;
          updated_at?: string;
          assigned_at: string;
        }[]
      >();

      for (const a of (assignmentsRes.data || []) as {
        id: string;
        student_id: string;
        advisor_profile_id: string | null;
        advisor_id: string | null;
        assignment_source?: string;
        assignment_rule_type?: string;
        source_range_raw?: string | null;
        updated_at?: string;
        assigned_at: string;
      }[]) {
        const list = assignmentsByStudent.get(a.student_id) || [];
        list.push(a);
        assignmentsByStudent.set(a.student_id, list);
      }

      rows = ((stuRes.data || []) as {
        id: string;
        diu_id: string | null;
        full_name: string;
        email: string;
        batch: string | null;
        department_code: string | null;
      }[]).map((st) => {
        const list = assignmentsByStudent.get(st.id) || [];
        const primary = list[0];
        const adv = primary
          ? (primary.advisor_profile_id ? advById.get(primary.advisor_profile_id) : undefined) ||
            (primary.advisor_id ? advByProfileId.get(primary.advisor_id) : undefined)
          : undefined;

        const status: "assigned" | "unassigned" | "conflict" =
          list.length > 1 ? "conflict" : list.length === 1 ? "assigned" : "unassigned";

        return {
          studentId: st.id,
          diuId: st.diu_id,
          studentName: st.full_name,
          studentEmail: st.email,
          batch: st.batch,
          departmentCode: st.department_code,
          assignmentId: primary?.id || null,
          advisorProfileId: adv?.id || primary?.advisor_profile_id || null,
          advisorName: adv?.full_name || null,
          advisorEmail: adv?.email || null,
          semesterId: selectedSemesterId,
          assignmentSource: primary?.assignment_source || null,
          assignmentRuleType: primary?.assignment_rule_type || null,
          sourceRangeRaw: primary?.source_range_raw || null,
          assignmentStatus: status,
          lastUpdated: primary?.updated_at || primary?.assigned_at || null,
          updatedByName: null,
        };
      });
    }
  } catch (err: unknown) {
    available = false;
    errorMessage = err instanceof Error ? err.message : "Failed to load assignments.";
  }

  return (
    <AppShell user={user} profile={profile}>
      <StudentAssignmentsView
        available={available}
        errorMessage={errorMessage}
        semesters={semesters}
        selectedSemesterId={selectedSemesterId}
        departments={departments}
        advisors={advisors}
        rows={rows}
        initialFilter={resolved.filter}
        initialBatch={resolved.batch}
      />
    </AppShell>
  );
}
