import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { UnifiedCoursesWorkspace } from "@/components/student/unified-courses-workspace";
import {
  getBatchSemesterCourses,
  getAllActiveCatalogCourses,
  normalizeBatch,
} from "@/lib/curriculum/batch-course-service";
import { getStudentPaymentClearance } from "@/lib/payment/payment-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MOCK_CURRENT_SEMESTER, ACTIVE_MOCK_SEMESTER_LABEL } from "@/lib/mock/data";

export interface StudentSemesterOption {
  id: string;
  label: string;
  isActive: boolean;
}

export default async function CoursesPage() {
  const { user, profile } = await requireOnboarded("/courses");

  let activeRegistration = null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("diu_student_active_registration")?.value;
    if (raw) {
      activeRegistration = JSON.parse(raw);
    }
  } catch {
    // ignore parse error
  }

  let activeSemesterId = MOCK_CURRENT_SEMESTER.id;
  let activeSemesterName = ACTIVE_MOCK_SEMESTER_LABEL;
  let semesterOptions: StudentSemesterOption[] = [
    { id: MOCK_CURRENT_SEMESTER.id, label: ACTIVE_MOCK_SEMESTER_LABEL, isActive: true },
  ];

  try {
    const supabase = await getSupabaseServerClient();
    const { data: semRows } = await supabase
      .from("semesters")
      .select("id, name, season, year, is_active, is_archived")
      .eq("is_archived", false)
      .order("year", { ascending: false });

    if (semRows && semRows.length > 0) {
      const list = semRows as Array<{
        id: string;
        name?: string | null;
        season: string;
        year: number;
        is_active: boolean;
      }>;
      semesterOptions = list.map((s) => ({
        id: s.id,
        label: s.name || `${s.season.charAt(0).toUpperCase() + s.season.slice(1)} ${s.year}`,
        isActive: s.is_active,
      }));
      const activeSem = list.find((s) => s.is_active) || list[0];
      activeSemesterId = activeSem.id;
      activeSemesterName =
        activeSem.name ||
        `${activeSem.season.charAt(0).toUpperCase() + activeSem.season.slice(1)} ${activeSem.year}`;
    }
  } catch {
    // Fallback to mock semester in local dev/test
  }

  // Retrieve batch-configured courses + full curriculum catalog in parallel
  const studentBatch = normalizeBatch(profile.batch || "72");
  const [batchCourseRecords, allCatalogCourses, paymentClearance] = await Promise.all([
    getBatchSemesterCourses(activeSemesterId, studentBatch),
    getAllActiveCatalogCourses(),
    getStudentPaymentClearance(profile.id, activeSemesterId),
  ]);
  const eligibleCourses = batchCourseRecords.map((r) => r.course);

  return (
    <AppShell user={user} profile={profile}>
      <UnifiedCoursesWorkspace
        initialProfile={profile}
        initialActiveRegistration={activeRegistration}
        eligibleCourses={eligibleCourses}
        allCatalogCourses={allCatalogCourses}
        semesters={semesterOptions}
        activeSemesterId={activeSemesterId}
        studentBatch={studentBatch}
        activeSemesterName={activeSemesterName}
        paymentClearance={paymentClearance}
      />
    </AppShell>
  );
}
