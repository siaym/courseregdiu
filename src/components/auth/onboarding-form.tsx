"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { studentOnboardingSchema, type StudentOnboardingInput } from "@/lib/validations/onboarding";
import { MOCK_DEPARTMENTS, MOCK_ADVISEE_QUEUE, MOCK_STUDENT_PROFILE } from "@/lib/mock/data";

interface OnboardingFormProps {
  initialFullName?: string;
  initialEmail?: string;
}

export function OnboardingForm({
  initialFullName = "Tanvir Ahmed Chowdhury",
  initialEmail = "tanvir.new@diu.edu.bd",
}: OnboardingFormProps) {
  const router = useRouter();
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState(false);

  // Collect existing student IDs to prevent duplicates
  const existingDiuIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (MOCK_STUDENT_PROFILE.diu_id) ids.add(MOCK_STUDENT_PROFILE.diu_id);
    MOCK_ADVISEE_QUEUE.forEach((app) => {
      if (app.student.diu_id) ids.add(app.student.diu_id);
    });
    return ids;
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentOnboardingInput>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      fullName: initialFullName,
      diuId: "",
      batch: "61st Batch",
      departmentCode: "CSE",
    },
  });

  const onSubmit = async (data: StudentOnboardingInput) => {
    setDuplicateError(null);
    setIsSubmitting(true);

    // 1. Duplicate Student ID check
    if (existingDiuIds.has(data.diuId.trim())) {
      setIsSubmitting(false);
      setDuplicateError(
        `DIU Student ID "${data.diuId}" is already registered. If this is your authentic ID, please contact the DIU Registrar Office.`
      );
      return;
    }

    // 2. Simulate persisting profile and marking onboarding_completed = true
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Store in localStorage for prototype demonstration persistence
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "diu_onboarded_student",
        JSON.stringify({
          fullName: data.fullName,
          diuId: data.diuId,
          batch: data.batch,
          departmentCode: data.departmentCode,
          email: initialEmail,
          onboardingCompleted: true,
          completedAt: new Date().toISOString(),
        })
      );
    }

    setIsSubmitting(false);
    setSuccessNotice(true);

    // Redirect to the Student Dashboard workspace
    setTimeout(() => {
      router.push("/dashboard?onboarded=true");
      router.refresh();
    }, 1000);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-xl max-w-md w-full overflow-hidden text-slate-100">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-800 space-y-1.5 text-center">
        <div className="mx-auto w-10 h-10 rounded-lg bg-[#008764] flex items-center justify-center text-white mb-2 shadow-xs">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Student Identity Verification
        </h1>
        <p className="text-xs text-slate-400">
          Daffodil International University Course Registration
        </p>
        <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60 mt-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{initialEmail}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
        {duplicateError && (
          <div className="p-3 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-xs">Duplicate Student ID</div>
              <p className="text-[11px] mt-0.5">{duplicateError}</p>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <div className="font-semibold text-xs">Profile Verified Successfully</div>
              <p className="text-[11px] mt-0.5">Redirecting to your course registration workspace...</p>
            </div>
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label htmlFor="fullName" className="font-medium text-slate-300">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">From Google Session</span>
          </div>
          <input
            id="fullName"
            type="text"
            {...register("fullName")}
            placeholder="e.g. Tanvir Ahmed Chowdhury"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
          {errors.fullName && (
            <p className="text-rose-400 text-[10px] font-mono">{errors.fullName.message}</p>
          )}
        </div>

        {/* DIU Student ID */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label htmlFor="diuId" className="font-medium text-slate-300">
              DIU Student ID <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">Format: 2XX-XX-XXXXX</span>
          </div>
          <input
            id="diuId"
            type="text"
            {...register("diuId")}
            placeholder="e.g. 221-15-4921"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-medium"
          />
          {errors.diuId && (
            <p className="text-rose-400 text-[10px] font-mono">{errors.diuId.message}</p>
          )}
        </div>

        {/* Intake Batch */}
        <div className="space-y-1">
          <label htmlFor="batch" className="font-medium text-slate-300 block">
            Academic Intake Batch <span className="text-rose-400">*</span>
          </label>
          <input
            id="batch"
            type="text"
            {...register("batch")}
            placeholder="e.g. 60th Batch"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          />
          {errors.batch && (
            <p className="text-rose-400 text-[10px] font-mono">{errors.batch.message}</p>
          )}
        </div>

        {/* Department Code */}
        <div className="space-y-1">
          <label htmlFor="departmentCode" className="font-medium text-slate-300 block">
            Academic Department <span className="text-rose-400">*</span>
          </label>
          <select
            id="departmentCode"
            {...register("departmentCode")}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {MOCK_DEPARTMENTS.map((dept) => (
              <option key={dept.code} value={dept.code}>
                {dept.code} — {dept.name}
              </option>
            ))}
          </select>
          {errors.departmentCode && (
            <p className="text-rose-400 text-[10px] font-mono">{errors.departmentCode.message}</p>
          )}
        </div>

        {/* Action */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="submit"
            disabled={isSubmitting || successNotice}
            className="w-full bg-[#008764] hover:bg-[#007053] disabled:opacity-50 text-white font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 h-9"
          >
            {isSubmitting ? (
              <span className="font-mono">Verifying Credentials...</span>
            ) : successNotice ? (
              <span className="font-mono">Verified ✓ Redirecting</span>
            ) : (
              <>
                <span>Complete Verification & Proceed</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
