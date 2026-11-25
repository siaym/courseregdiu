import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { getBatchDirectoryData } from "@/lib/admin/admin-service";
import { BatchManagementView } from "@/components/admin/batch-management-view";

export default async function AdminBatchesPage() {
  const { user, profile } = await requireAdmin("/admin/batches");
  const data = await getBatchDirectoryData();

  return (
    <AppShell user={user} profile={profile}>
      <BatchManagementView
        available={data.available}
        errorMessage={data.errorMessage}
        initialBatches={data.batches}
        departments={data.departments}
      />
    </AppShell>
  );
}
