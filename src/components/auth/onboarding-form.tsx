"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { studentOnboardingSchema, type StudentOnboardingInput } from "@/lib/validations/onboarding";
import { submitStudentOnboarding } from "@/app/onboarding/actions";

interface OnboardingFormProps {
  initialFullName?: string;
  initialEmail?: string;
}

export function OnboardingForm({
  initialFullName = "",
  initialEmail = "",
}: OnboardingFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StudentOnboardingInput>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      fullName: initialFullName,
      diuId: "",
      batch: "61st Batch",
    },
  });

  const onSubmit = async (data: StudentOnboardingInput) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await submitStudentOnboarding(data);

      if (!result.success) {
        setIsSubmitting(false);
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, msg]) => {
            setError(field as keyof StudentOnboardingInput, { message: msg });
          });
        }
        setServerError(result.error || "Failed to complete onboarding.");
        return;
      }

      setIsSubmitting(false);
      setSuccessNotice(true);

      // Redirect to the Student Dashboard workspace
      setTimeout(() => {
        router.push("/dashboard?onboarded=true");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during submission.";
      setServerError(message);
    }
  };

  return (
    <div className="rounded-2xl border border-[#1c263c] bg-[#121827] shadow-xl max-w-md w-full overflow-hidden text-slate-100">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-[#1c263c] space-y-1.5 text-center">
        <div className="mx-auto w-11 h-11 rounded-xl bg-[#008764] flex items-center justify-center text-white mb-2 shadow-xs">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Student Profile Onboarding
        </h1>
        <p className="text-xs text-[#8e9db2]">
          Confirm your academic identity to activate course registration.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {/* Institutional Email (Read-only reference from Google OAuth) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Institutional Google Account
          </label>
          <input
            type="email"
            value={initialEmail || "student@diu.edu.bd"}
            readOnly
            disabled
            className="w-full px-3 py-2 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-slate-400 cursor-not-allowed font-mono"
          />
          <p className="text-[11px] text-[#8e9db2]">
            Restricted to verified @diu.edu.bd domain.
          </p>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-xs font-medium text-slate-200">
            Full Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            placeholder="e.g. Siyam Ahmed"
            {...register("fullName")}
            className={`w-full px-3 py-2 text-xs bg-[#0b0f19] border rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors ${
              errors.fullName ? "border-rose-500" : "border-[#1e293b]"
            }`}
          />
          {errors.fullName && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.fullName.message}</span>
            </p>
          )}
        </div>

        {/* DIU Student ID */}
        <div className="space-y-1.5">
          <label htmlFor="diuId" className="text-xs font-medium text-slate-200">
            DIU Student ID <span className="text-rose-400">*</span>
          </label>
          <input
            id="diuId"
            type="text"
            placeholder="e.g. 211-15-456 or 221-15-12345"
            {...register("diuId")}
            className={`w-full px-3 py-2 text-xs bg-[#0b0f19] border rounded-xl text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-blue-500 transition-colors ${
              errors.diuId || serverError ? "border-rose-500" : "border-[#1e293b]"
            }`}
          />
          {errors.diuId && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.diuId.message}</span>
            </p>
          )}
          <p className="text-[10px] text-[#8e9db2]">
            Standard DIU format: Semester-Dept-Roll (e.g. 211-15-456).
          </p>
        </div>

        {/* Batch */}
        <div className="space-y-1.5">
          <label htmlFor="batch" className="text-xs font-medium text-slate-200">
            Intake Batch <span className="text-rose-400">*</span>
          </label>
          <input
            id="batch"
            type="text"
            placeholder="e.g. 61st Batch or 60th Batch"
            {...register("batch")}
            className={`w-full px-3 py-2 text-xs bg-[#0b0f19] border rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors ${
              errors.batch ? "border-rose-500" : "border-[#1e293b]"
            }`}
          />
          {errors.batch && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.batch.message}</span>
            </p>
          )}
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-rose-200">Onboarding Failed</span>
              <p className="text-[11px] text-rose-300">{serverError}</p>
            </div>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Profile submitted successfully. Redirecting to your workspace...</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || successNotice}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#008764] hover:bg-[#007355] text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Profile to Database...</span>
              </>
            ) : successNotice ? (
              <span>Redirecting...</span>
            ) : (
              <>
                <span>Complete Profile & Enter Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-[#8e9db2] text-center pt-2">
          Official DIU academic records will be reconciled with the Department Registrar.
        </p>
      </form>
    </div>
  );
}
