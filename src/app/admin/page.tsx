import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { getAdminOverviewData } from "@/lib/admin/admin-service";
import { getAllSystemSettings } from "@/lib/settings/system-settings";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string }> | { semester?: string };
}) {
  const { user, profile } = await requireAdmin("/admin");
  const resolvedParams = searchParams ? await searchParams : {};

  const [overview, systemSettings] = await Promise.all([
    getAdminOverviewData(resolvedParams.semester),
    getAllSystemSettings(),
  ]);

  return (
    <AppShell user={user} profile={profile}>
      <AdminDashboardView overview={overview} systemSettings={systemSettings} />
    </AppShell>
  );
}
