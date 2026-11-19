import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireAuth } from "@/lib/auth/roles";

export default async function OnboardingPage() {
  const { user, profile } = await requireAuth("/onboarding");

  // If returning student has already completed onboarding, proceed to dashboard
  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  const initialFullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    "";

  const initialEmail = user?.email || "";

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[#1c263c]">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-medium text-[#8e9db2] hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Authentication
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Mandatory Student Profile Activation
          </span>
        </div>
      </div>

      {/* Main Center Form */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <OnboardingForm
          initialFullName={initialFullName}
          initialEmail={initialEmail}
        />
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center pt-6 border-t border-[#1c263c] text-xs text-[#8e9db2]">
        Daffodil International University • Academic Advising & Registration Division
      </div>
    </div>
  );
}
