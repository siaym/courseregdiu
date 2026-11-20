import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminBatchCourseStudio } from "@/components/admin/admin-batch-course-studio";
import { getBatchSemesterCourses } from "@/lib/curriculum/batch-course-service";

export default async function AdminCurriculumPage() {
  const { user, profile } = await requireAdmin("/admin/curriculum");

  const initialRecords = await getBatchSemesterCourses("sem-spring-2027", "69");

  return (
    <AppShell user={user} profile={profile}>
      <AdminBatchCourseStudio
        initialRecords={initialRecords}
        initialBatch="69"
        initialSemesterId="sem-spring-2027"
      />
    </AppShell>
  );
}
