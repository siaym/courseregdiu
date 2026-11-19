import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminEmailManagementView } from "@/components/admin/admin-email-management-view";
import { getAdminStudentEmailDirectoryAction } from "@/app/admin/actions";

export default async function AdminEmailsPage() {
  const { user, profile } = await requireAdmin("/admin/emails");
  const { students, authorizedEmails, auditLog } = await getAdminStudentEmailDirectoryAction();

  return (
    <AppShell user={user} profile={profile}>
      <AdminEmailManagementView
        initialStudents={students}
        initialAuthorizedEmails={authorizedEmails}
        initialAuditLog={auditLog}
      />
    </AppShell>
  );
}
