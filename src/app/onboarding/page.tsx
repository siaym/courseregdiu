import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/roles";
import { MOCK_FIRST_TIME_STUDENT_PROFILE } from "@/lib/mock/data";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  const initialFullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    MOCK_FIRST_TIME_STUDENT_PROFILE.full_name;

  const initialEmail =
    user?.email ||
    MOCK_FIRST_TIME_STUDENT_PROFILE.email;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800/80">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Academic Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Phase 1 Required Onboarding
          </span>
        </div>
      </div>

      {/* Main Center Form */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <OnboardingForm
          initialFullName={initialFullName}
          initialEmail={initialEmail}
        />

        {/* Prototype Verification Callout */}
        <div className="max-w-lg w-full mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Info className="h-4 w-4 text-emerald-400" />
            <span>Prototype Evaluation Controls:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Every first-time student must confirm their Full Name, Student ID, and Batch. In production, this record is verified against the university student database and persisted in <code className="text-emerald-300 font-mono">public.profiles</code> with <code className="text-emerald-300 font-mono">onboarding_completed = true</code>.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-[11px] text-[#008764] hover:underline font-semibold"
            >
              Simulate Returning Student (Skip to Dashboard) &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 pt-6 border-t border-slate-800/80 max-w-4xl w-full mx-auto">
        Daffodil International University Academic Registration System • Student Verification Gateway
      </footer>
    </div>
  );
}
