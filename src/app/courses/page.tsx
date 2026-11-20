import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarded } from "@/lib/auth/roles";
import { UnifiedCoursesWorkspace } from "@/components/student/unified-courses-workspace";
import { getBatchSemesterCourses, normalizeBatch } from "@/lib/curriculum/batch-course-service";
import { getStudentPaymentClearance } from "@/lib/payment/payment-service";
import { MOCK_CURRENT_SEMESTER, ACTIVE_MOCK_SEMESTER_LABEL } from "@/lib/mock/data";

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

  // Retrieve batch-configured courses for this student's cohort in the active semester
  const studentBatch = normalizeBatch(profile.batch || "60");
  const batchCourseRecords = await getBatchSemesterCourses(MOCK_CURRENT_SEMESTER.id, studentBatch);
  const eligibleCourses = batchCourseRecords.map((r) => r.course);

  // Retrieve verified accounts tuition clearance status
  const paymentClearance = await getStudentPaymentClearance(profile.id, MOCK_CURRENT_SEMESTER.id);

  return (
    <AppShell user={user} profile={profile}>
      <UnifiedCoursesWorkspace
        initialProfile={profile}
        initialActiveRegistration={activeRegistration}
        eligibleCourses={eligibleCourses}
        studentBatch={studentBatch}
        activeSemesterName={ACTIVE_MOCK_SEMESTER_LABEL}
        paymentClearance={paymentClearance}
      />
    </AppShell>
  );
}
