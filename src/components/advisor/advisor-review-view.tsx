"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_SECTIONS,
  MOCK_COMPLETED_COURSE_CODES,
  ACTIVE_MOCK_SEMESTER_LABEL,
} from "@/lib/mock/data";
import {
  getPrerequisiteStatus,
  getCreditLimitByCgpa,
} from "@/lib/mock/helpers";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Check,
  UserCheck,
  User,
  Layers,
  BookOpen,
  CreditCard,
  FileCheck2,
  Mail,
  Phone,
} from "lucide-react";
import {
  finalizeAdvisorReviewAction,
  reassignAdviseeSectionAction,
} from "@/app/advisor/actions";

export interface AdvisorReviewViewProps {
  registrationId: string;
}

export function AdvisorReviewView({ registrationId }: AdvisorReviewViewProps) {
  const router = useRouter();

  // Find application in mock queue
  const initialApp = MOCK_ADVISEE_QUEUE.find((a) => a.registration.id === registrationId);

  const application = initialApp || MOCK_ADVISEE_QUEUE[0];
  const [items, setItems] = React.useState(application ? application.items : []);
  const [advisorNotes, setAdvisorNotes] = React.useState(application?.registration.advisor_notes || "");
  const [currentStatus, setCurrentStatus] = React.useState(application?.registration.status || "pending_advisor");

  // Queue paging navigation
  const currentIndex = initialApp
    ? MOCK_ADVISEE_QUEUE.findIndex((a) => a.registration.id === application.registration.id)
    : -1;
  const prevApp = currentIndex > 0 ? MOCK_ADVISEE_QUEUE[currentIndex - 1] : null;
  const nextApp = currentIndex >= 0 && currentIndex < MOCK_ADVISEE_QUEUE.length - 1 ? MOCK_ADVISEE_QUEUE[currentIndex + 1] : null;

  // Dialog states
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("PREREQUISITE_DEFICIENCY");
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "destructive" } | null>(null);

  // Keyboard navigation (J for Prev, K for Next)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.key === "j" || e.key === "J") && prevApp) {
        router.push(`/advisor/review/${prevApp.registration.id}`);
      } else if ((e.key === "k" || e.key === "K") && nextApp) {
        router.push(`/advisor/review/${nextApp.registration.id}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevApp, nextApp, router]);

  if (!initialApp) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#121827] border border-[#1c263c] rounded-2xl max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <h2 className="text-base font-semibold text-white">Application Unassigned or Not Found</h2>
        <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
          The requested student registration ({registrationId}) is not assigned to your advising cohort.
        </p>
        <Link
          href="/advisor/queue"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Application Center</span>
        </Link>
      </div>
    );
  }

  // Section Reassignment handler
  const handleReassignSection = async (courseId: string, currentSectionId: string, newSectionId: string) => {
    const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
    if (!newSection) return;

    setItems((prev) =>
      prev.map((it) => (it.section.id === currentSectionId ? { ...it, section: newSection } : it))
    );

    // Call server action
    await reassignAdviseeSectionAction({
      registrationId: application.registration.id,
      currentSectionId,
      newSectionId,
    });

    setToastMessage({
      text: `Reassigned ${newSection.course_code} to Section ${newSection.section_name}.`,
      type: "success",
    });
  };

  // Finalize Approval
  const handleConfirmApproval = async () => {
    setIsProcessing(true);
    try {
      const res = await finalizeAdvisorReviewAction({
        registrationId: application.registration.id,
        action: "approve",
        notes: advisorNotes,
      });

      setIsProcessing(false);
      setIsApproveOpen(false);

      if (res.success) {
        setCurrentStatus("approved");
        setToastMessage({
          text: `Application for ${application.student.full_name} has been approved and finalized.`,
          type: "success",
        });
      } else {
        setToastMessage({
          text: res.error || "Failed to finalize application approval.",
          type: "destructive",
        });
      }
    } catch {
      setIsProcessing(false);
      setIsApproveOpen(false);
      setCurrentStatus("approved");
      setToastMessage({
        text: `Application for ${application.student.full_name} finalized in session.`,
        type: "success",
      });
    }
  };

  // Finalize Rejection / Revision Request
  const handleConfirmRejection = async () => {
    if (!advisorNotes.trim()) {
      alert("Faculty advising remarks are required when returning an application for revisions.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await finalizeAdvisorReviewAction({
        registrationId: application.registration.id,
        action: "reject",
        notes: `[${rejectionReason}] ${advisorNotes}`,
      });

      setIsProcessing(false);
      setIsRejectOpen(false);

      if (res.success) {
        setCurrentStatus("rejected");
        setToastMessage({
          text: `Application returned to ${application.student.full_name} for adjustments.`,
          type: "success",
        });
      } else {
        setToastMessage({
          text: res.error || "Failed to return application.",
          type: "destructive",
        });
      }
    } catch {
      setIsProcessing(false);
      setIsRejectOpen(false);
      setCurrentStatus("rejected");
    }
  };

  const totalCredits = items.reduce((sum, it) => sum + (it.section.credits || it.course.credits || 3.0), 0);
  const creditRules = getCreditLimitByCgpa(application.student.cgpa);
  const isOverloaded = totalCredits > creditRules.maxCredits;

  const generalCount = items.filter((it) => it.course_type !== "retake").length;
  const retakeCount = items.filter((it) => it.course_type === "retake").length;

  return (
    <div className="space-y-6 text-slate-100 max-w-6xl mx-auto py-2">
      {/* ========================================================================= */}
      {/* TOP BAR: Navigation, Paging & Status                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1c263c]">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white h-8 px-2.5 rounded-lg">
            <Link href="/advisor/queue">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Application Center</span>
            </Link>
          </Button>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono text-slate-300">
            Advisee <strong className="text-emerald-400">{currentIndex + 1} of {MOCK_ADVISEE_QUEUE.length}</strong>
          </span>
          <span className="hidden md:inline text-xs text-slate-500 font-mono ml-1">
            (Shortcuts: [J] Prev • [K] Next)
          </span>
        </div>

        {/* Paging Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {prevApp && (
            <Button asChild size="sm" variant="outline" className="border-[#1c263c] text-xs text-slate-300 bg-[#121827] hover:bg-[#1a233a] h-8 px-3 rounded-lg">
              <Link href={`/advisor/review/${prevApp.registration.id}`}>
                &larr; Prev
              </Link>
            </Button>
          )}
          {nextApp && (
            <Button asChild size="sm" variant="outline" className="border-[#1c263c] text-xs text-slate-300 bg-[#121827] hover:bg-[#1a233a] h-8 px-3 rounded-lg">
              <Link href={`/advisor/review/${nextApp.registration.id}`}>
                Next &rarr;
              </Link>
            </Button>
          )}
          <StatusBadge status={currentStatus} className="text-xs ml-1" />
        </div>
      </div>

      {/* Floating feedback alert */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs animate-in fade-in duration-100 ${
            toastMessage.type === "success"
              ? "bg-[#121827] border-emerald-800 text-emerald-300"
              : "bg-[#121827] border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <div className="flex items-center gap-2.5">
            {nextApp && (
              <Link
                href={`/advisor/review/${nextApp.registration.id}`}
                className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
              >
                Next Advisee &rarr;
              </Link>
            )}
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs ml-3"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STUDENT INFORMATION                                                    */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c263c] pb-3">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-[#008764]" />
            <h2 className="text-base font-bold text-white tracking-tight">
              1. Student Information
            </h2>
          </div>
          {/* CGPA display */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">CGPA:</span>
            <span
              className={`px-2.5 py-0.5 rounded-lg border font-bold text-xs ${
                application.isProbation
                  ? "bg-rose-950/60 border-rose-800 text-rose-300"
                  : "bg-[#0b0f19] border-[#1c263c] text-white"
              }`}
            >
              {application.student.cgpa ? application.student.cgpa.toFixed(2) : "N/A"}{" "}
              <span className="text-[11px] text-slate-500 font-normal">/ 4.00</span>
            </span>
            {application.isProbation && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400 text-[10px] uppercase font-bold">
                Probation
              </span>
            )}
          </div>
        </div>

        {/* Primary Identity & Contact Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Primary ID & Name (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Prominent Student ID (Primary Identifier) */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0b0f19] border border-emerald-800/80 text-emerald-400 font-mono text-base sm:text-lg font-bold shadow-xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-semibold">ID</span>
                <span>{application.student.diu_id}</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {application.student.full_name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Department of {application.student.department_code}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-300">
                {application.student.batch || "Batch"}
              </span>
            </div>
          </div>

          {/* Contact Details: Email & Phone (5 cols) */}
          <div className="lg:col-span-5 space-y-2 p-3.5 rounded-xl bg-[#0b0f19] border border-[#1c263c] text-xs font-mono">
            {/* Institutional Email */}
            <div className="flex items-center gap-2 text-slate-200">
              <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <a
                href={`mailto:${application.student.email}`}
                className="hover:text-sky-300 hover:underline truncate"
                title={application.student.email}
              >
                {application.student.email}
              </a>
            </div>

            {/* Phone Number */}
            {application.student.phone && (
              <div className="flex items-center gap-2 text-slate-200">
                <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <a
                  href={`tel:${application.student.phone}`}
                  className="hover:text-emerald-300 hover:underline"
                >
                  {application.student.phone}
                </a>
              </div>
            )}

            {/* Authorized Alternative Email (if registered) */}
            {application.student.authorized_alternative_email && (
              <div className="pt-2 border-t border-[#1c263c] flex items-center gap-1.5 text-[11px] text-emerald-400">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="text-slate-400 font-sans">Alt:</span>
                <span className="truncate">{application.student.authorized_alternative_email}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 shrink-0 ml-auto font-sans">
                  Verified
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Academic Warning Alerts if probation */}
        {application.isProbation && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Academic Probation Warning: CGPA is below 2.00. Term registration load is restricted to 9.0 credits.</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PAYMENT INFORMATION (Promoted after Student Information)               */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#1c263c] pb-3">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-[#008764]" />
            <h2 className="text-base font-bold text-white tracking-tight">
              2. Payment Information
            </h2>
          </div>

          <div className="shrink-0">
            {application.registration.payment_cleared ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Tuition Accounts Cleared</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span>Financial Clearance Hold</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-slate-300 font-semibold flex items-center gap-2">
              <span>Accounts Clearance Status:</span>
              {application.registration.payment_cleared ? (
                <span className="text-emerald-400 font-bold">Verified by Finance & Accounts</span>
              ) : (
                <span className="text-rose-400 font-bold">Financial Hold: Clearance Pending</span>
              )}
            </div>
            <p className="text-[#8e9db2] text-[11px] leading-relaxed">
              {application.registration.payment_cleared
                ? "Minimum 50% semester advance tuition fee confirmed. Student is academically eligible for advising authorization."
                : "Student has outstanding tuition balances. Advising approval should only proceed if special departmental clearance is granted."}
            </p>
          </div>

          <div className="shrink-0">
            {application.registration.payment_cleared ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Tuition Accounts Cleared</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span>Financial Clearance Hold</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION INFORMATION                                                    */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-[#1c263c] pb-3">
          <Layers className="h-5 w-5 text-[#008764]" />
          <h2 className="text-base font-bold text-white tracking-tight">
            3. Section Information
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c]">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-300">
              Assigned Cohort Section Preference:
            </div>
            <p className="text-xs text-slate-400">
              The student attended <strong>{application.registration.previous_section || "69_K"}</strong> in the preceding term and requested transfer to <strong>{application.registration.desired_section || "69_D"}</strong> for {ACTIVE_MOCK_SEMESTER_LABEL}.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-[#121827] border border-[#1c263c] text-center">
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Previous</div>
              <strong className="text-white text-sm">{application.registration.previous_section || "69_K"}</strong>
            </div>
            <span className="text-slate-500 text-lg">&rarr;</span>
            <div className="px-3 py-1.5 rounded-lg bg-[#121827] border border-emerald-800/80 text-center">
              <div className="text-emerald-400/80 text-[10px] uppercase font-semibold">Desired</div>
              <strong className="text-emerald-400 text-sm">{application.registration.desired_section || "69_D"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. COURSE SELECTION                                                       */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c263c] pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#008764]" />
            <h2 className="text-base font-bold text-white tracking-tight">
              4. Course Selection
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-300">
            Total Load: <strong className="text-white">{items.length} Courses</strong> • <strong className="text-emerald-400">{totalCredits.toFixed(1)} Credits</strong> ({generalCount} General, {retakeCount} Retake)
          </div>
        </div>

        {/* Credit Overload Warning if applicable */}
        {isOverloaded && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Credit Load Alert: Proposed total load ({totalCredits.toFixed(1)} Cr) exceeds standard cap of {creditRules.maxCredits.toFixed(1)} Cr for CGPA {application.student.cgpa?.toFixed(2)}.
            </span>
          </div>
        )}

        {/* Table of Selected Courses */}
        <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121827] border-b border-[#1c263c] text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Course Code & Title</th>
                  <th className="py-3 px-3 font-semibold text-center w-16">Credits</th>
                  <th className="py-3 px-3 font-semibold w-28">Classification</th>
                  <th className="py-3 px-3 font-semibold w-36">Prerequisites</th>
                  <th className="py-3 px-4 font-semibold text-right">Assigned Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c263c]">
                {items.map((it) => {
                  const { isEligible, missingCodes } = getPrerequisiteStatus(
                    it.course.prerequisite_codes,
                    MOCK_COMPLETED_COURSE_CODES
                  );
                  const availableSections = MOCK_SECTIONS.filter((s) => s.course_id === it.course.id);
                  const isRetake = it.course_type === "retake";

                  return (
                    <tr key={it.item.id} className="hover:bg-[#121827]/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-400 text-xs">
                          {it.course.code}
                        </div>
                        <div className="text-white font-medium text-xs mt-0.5">
                          {it.course.title}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-200">
                        {(it.section.credits || it.course.credits).toFixed(1)}
                      </td>

                      {/* Course Classification */}
                      <td className="py-3 px-3">
                        {isRetake ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-950/70 border border-amber-800 text-amber-300">
                            Retake
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-950/70 border border-blue-800 text-blue-300">
                            General
                          </span>
                        )}
                      </td>

                      {/* Prerequisites */}
                      <td className="py-3 px-3">
                        {isEligible ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono font-medium">
                            <Check className="h-3.5 w-3.5" />
                            <span>Satisfied</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-mono font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Missing: {missingCodes.join(", ")}</span>
                          </span>
                        )}
                      </td>

                      {/* Assigned Section Dropdown */}
                      <td className="py-3 px-4 text-right">
                        {availableSections.length > 1 ? (
                          <select
                            value={it.section.id}
                            onChange={(e) => handleReassignSection(it.course.id, it.section.id, e.target.value)}
                            className="max-w-[240px] ml-auto text-xs font-mono bg-[#121827] border border-[#1c263c] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            {availableSections.map((s) => {
                              const isFull = s.enrolled_count >= s.capacity;
                              return (
                                <option key={s.id} value={s.id}>
                                  Sec {s.section_name} ({s.enrolled_count}/{s.capacity} seats){isFull ? " [FULL]" : ""}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="font-mono text-xs text-slate-300 px-2 py-1 rounded bg-[#121827] border border-[#1c263c]">
                            Sec {it.section.section_name} (Fixed)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADVISOR DECISION                                                       */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-[#1c263c] pb-3">
          <FileCheck2 className="h-5 w-5 text-[#008764]" />
          <h2 className="text-base font-bold text-white tracking-tight">
            5. Advisor Decision
          </h2>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Faculty Advising Remarks / Student Instructions:
          </label>
          <textarea
            value={advisorNotes}
            onChange={(e) => setAdvisorNotes(e.target.value)}
            placeholder="Enter academic feedback, section override rationale, or specific revision directives for this advisee..."
            rows={3}
            className="w-full p-3 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#1c263c]">
          <div className="text-xs text-slate-400 font-mono">
            Application Status: <strong className="text-white">{currentStatus}</strong>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(true)}
              className="border-rose-900/60 text-rose-300 hover:bg-rose-950/40 text-xs h-9 px-4 rounded-xl"
            >
              Request Revisions
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsApproveOpen(true)}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold h-9 px-5 rounded-xl shadow-xs"
            >
              Approve Registration
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Approve Registration */}
      <Dialog open={isApproveOpen} onClose={() => setIsApproveOpen(false)}>
        <DialogContent className="border-[#1c263c] bg-[#121827] text-slate-100 max-w-md p-6">
          <DialogHeader className="border-b border-[#1c263c] pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Authorize Course Registration</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Confirm official enrollment authorization for {ACTIVE_MOCK_SEMESTER_LABEL}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3.5 bg-[#0b0f19] rounded-xl border border-[#1c263c] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <strong className="text-white">{application.student.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID:</span>
                <strong className="text-emerald-400">{application.student.diu_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cohort:</span>
                <strong className="text-white">{application.registration.previous_section || "69_K"} &rarr; {application.registration.desired_section || "69_D"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Load:</span>
                <strong className="text-white">{totalCredits.toFixed(1)} Credits ({items.length} Courses)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accounts Clearance:</span>
                <strong className={application.registration.payment_cleared ? "text-emerald-400" : "text-amber-400"}>
                  {application.registration.payment_cleared ? "Verified" : "Pending Hold"}
                </strong>
              </div>
            </div>

            {!application.registration.payment_cleared && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                ⚠️ Caution: This student has an active accounts hold. Finalizing will grant prerequisite and enrollment clearance.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#1c263c] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              className="text-xs border-[#1c263c] text-slate-300 hover:bg-[#1a233a] h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleConfirmApproval}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold h-9 px-4 rounded-xl"
            >
              {isProcessing ? "Authorizing..." : "Authorize & Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Request Revisions */}
      <Dialog open={isRejectOpen} onClose={() => setIsRejectOpen(false)}>
        <DialogContent className="border-[#1c263c] bg-[#121827] text-slate-100 max-w-md p-6">
          <DialogHeader className="border-b border-[#1c263c] pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <span>Return Application for Revisions</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              The student will receive your revision directives and be required to re-submit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 text-xs font-semibold">
                Primary Reason for Revision:
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs font-mono bg-[#0b0f19] border border-[#1c263c] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="PREREQUISITE_DEFICIENCY">Prerequisite Not Met</option>
                <option value="SECTION_ADJUSTMENT">Section Reassignment Required</option>
                <option value="SECTION_CAPACITY">Section Capacity Limit Exceeded</option>
                <option value="CREDIT_OVERLOAD">Exceeds Maximum Permitted Credits</option>
                <option value="TUITION_HOLD">Accounts Tuition Payment Incomplete</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 text-xs font-semibold">
                Mandatory Feedback to Student:
              </label>
              <textarea
                value={advisorNotes}
                onChange={(e) => setAdvisorNotes(e.target.value)}
                placeholder="Explain the required course/section changes..."
                rows={3}
                className="w-full p-3 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono resize-none leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#1c263c] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              className="text-xs border-[#1c263c] text-slate-300 hover:bg-[#1a233a] h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleConfirmRejection}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-9 px-4 rounded-xl"
            >
              {isProcessing ? "Returning..." : "Return to Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
