import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getAdvisorDirectoryData } from "@/lib/admin/admin-service";
import { AdvisorManagementView } from "@/components/admin/advisor-management-view";

export default async function AdminAdvisorsPage() {
  const { user, profile } = await requireAdmin("/admin/advisors");
  const data = await getAdvisorDirectoryData();

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorManagementView
        available={data.available}
        errorMessage={data.errorMessage}
        initialAdvisors={data.advisors}
        departments={data.departments}
        semesters={data.semesters}
      />
    </AppShell>
  );
}
