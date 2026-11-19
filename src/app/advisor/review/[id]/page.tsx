import { AppShell } from "@/components/shell/app-shell";
import { requireAdvisor } from "@/lib/auth/roles";
import { AdvisorReviewView } from "@/components/advisor/advisor-review-view";

interface AdvisorReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdvisorReviewPage({
  params,
}: AdvisorReviewPageProps) {
  const { id } = await params;
  const { user, profile } = await requireAdvisor(`/advisor/review/${id}`);

  return (
    <AppShell user={user} profile={profile}>
      <AdvisorReviewView registrationId={id} />
    </AppShell>
  );
}
