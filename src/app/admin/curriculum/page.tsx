import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CurriculumManagementView } from "@/components/admin/curriculum-management-view";
import type { MasterCourseRow } from "@/app/admin/curriculum/actions";
import type { BatchRow, DepartmentRow, SemesterRow } from "@/lib/admin/admin-service";

export default async function AdminCurriculumPage() {
  const { user, profile } = await requireAdmin("/admin/curriculum");

  let available = true;
  let errorMessage: string | undefined;
  let courses: MasterCourseRow[] = [];
  let semesters: SemesterRow[] = [];
  let batches: BatchRow[] = [];
  let departments: DepartmentRow[] = [];
  let semesterCourses: { id: string; semester_id: string; course_id: string; is_active: boolean }[] = [];
  let batchCourses: { id: string; semester_id: string; batch: string; course_id: string }[] = [];
  let specializationOfferings: {
    id: string;
    semester_id: string;
    batch: string;
    specialization_group: string;
    required_courses: number | null;
    required_credits: number | null;
    is_active: boolean;
  }[] = [];
  let importHistory: {
    id: string;
    file_name: string;
    source_worksheet: string | null;
    imported_count: number;
    failed_count: number;
    status: string;
    created_at: string;
  }[] = [];

  try {
    const supabase = await getSupabaseServerClient();
    const [cRes, sRes, bRes, dRes, scRes, bcRes, spRes, ihRes] = await Promise.all([
      supabase.from("courses").select("*").order("code", { ascending: true }),
      supabase.from("semesters").select("*").order("year", { ascending: false }),
      supabase.from("batches").select("*").order("batch_label", { ascending: true }),
      supabase.from("departments").select("*").order("code", { ascending: true }),
      supabase.from("semester_courses").select("id, semester_id, course_id, is_active"),
      supabase.from("batch_semester_courses").select("id, semester_id, batch, course_id"),
      supabase.from("specialization_offerings").select("*"),
      supabase.from("course_import_history").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (cRes.error) {
      available = false;
      errorMessage = cRes.error.message;
    } else {
      courses = (cRes.data || []) as MasterCourseRow[];
      semesters = (sRes.data || []) as SemesterRow[];
      batches = (bRes.data || []) as BatchRow[];
      departments = (dRes.data || []) as DepartmentRow[];
      semesterCourses = (scRes.data || []) as typeof semesterCourses;
      batchCourses = (bcRes.data || []) as typeof batchCourses;
      specializationOfferings = (spRes.data || []) as typeof specializationOfferings;
      importHistory = (ihRes.data || []) as typeof importHistory;
    }
  } catch (err: unknown) {
    available = false;
    errorMessage = err instanceof Error ? err.message : "Failed to load curriculum catalog.";
  }

  return (
    <AppShell user={user} profile={profile}>
      <CurriculumManagementView
        available={available}
        errorMessage={errorMessage}
        courses={courses}
        semesters={semesters}
        batches={batches}
        departments={departments}
        semesterCourses={semesterCourses}
        batchCourses={batchCourses}
        specializationOfferings={specializationOfferings}
        importHistory={importHistory}
      />
    </AppShell>
  );
}
