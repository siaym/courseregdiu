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
        <p className="text-xs text-[#8e9db2] mt-1.5 max-w-sm">
          The requested student registration ({registrationId}) is not assigned to your advising cohort.
        </p>
        <Link
          href="/advisor"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Advisee Queue</span>
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
          text: `Application for ${application.student.full_name} (${application.student.diu_id}) approved and officially enrolled.`,
          type: "success",
        });
      } else {
        setToastMessage({
          text: res.error || "Failed to finalize approval.",
          type: "destructive",
        });
      }
    } catch {
      setIsProcessing(false);
      setIsApproveOpen(false);
      setCurrentStatus("approved");
    }
  };

  // Finalize Rejection / Revision Request
  const handleConfirmRejection = async () => {
    setIsProcessing(true);
    try {
      const formattedNotes = `[${rejectionReason}] ${advisorNotes}`;
      const res = await finalizeAdvisorReviewAction({
        registrationId: application.registration.id,
        action: "reject",
        notes: formattedNotes,
      });

      setIsProcessing(false);
      setIsRejectOpen(false);

      if (res.success) {
        setCurrentStatus("rejected");
        setToastMessage({
          text: `Advising slip returned to ${application.student.full_name} with requested adjustments.`,
          type: "destructive",
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
    <div className="space-y-4 text-slate-100 max-w-6xl mx-auto py-2">
      {/* Top Bar: Queue Navigation & Keyboard Hints */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-[#1c263c]">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white h-7 px-2">
            <Link href="/advisor">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Queue
            </Link>
          </Button>
          <span className="text-slate-700">/</span>
          <span className="text-xs font-mono text-slate-300">
            Advisee <strong className="text-emerald-400">{currentIndex + 1} of {MOCK_ADVISEE_QUEUE.length}</strong>
          </span>
          <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
            (Shortcuts: [J] Prev • [K] Next)
          </span>
        </div>

        {/* Paging Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {prevApp && (
            <Button asChild size="sm" variant="outline" className="border-[#1c263c] text-xs text-slate-300 bg-[#121827] hover:bg-[#1a233a] h-7 px-2.5">
              <Link href={`/advisor/review/${prevApp.registration.id}`}>
                &larr; Prev
              </Link>
            </Button>
          )}
          {nextApp && (
            <Button asChild size="sm" variant="outline" className="border-[#1c263c] text-xs text-slate-300 bg-[#121827] hover:bg-[#1a233a] h-7 px-2.5">
              <Link href={`/advisor/review/${nextApp.registration.id}`}>
                Next &rarr;
              </Link>
            </Button>
          )}
          <StatusBadge status={currentStatus} className="text-[10px] ml-1" />
        </div>
      </div>

      {/* Floating feedback alert */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs animate-in fade-in duration-100 ${
            toastMessage.type === "success"
              ? "bg-[#121827] border-emerald-800 text-emerald-300"
              : "bg-[#121827] border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <div className="flex items-center gap-2">
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

      {/* 1. Student Metadata Bar (High information density, zero fluff) */}
      <div className="p-4 rounded-xl border border-[#1c263c] bg-[#121827] space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {application.student.full_name}
              </h2>
              <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c]">
                {application.student.diu_id}
              </span>
              <span className="text-xs text-slate-400">
                Dept. of {application.student.department_code} • {application.student.batch || "61st Batch"}
              </span>
            </div>

            {/* Email and Identity details */}
            <div className="text-xs text-[#8e9db2] font-mono space-y-0.5">
              <div>
                Primary Email: <span className="text-slate-200">{application.student.email}</span>
                {application.student.phone && ` • Mobile: ${application.student.phone}`}
              </div>
              {application.student.authorized_alternative_email && (
                <div className="text-emerald-400 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  <span>Authorized Alt Personal Email: <strong>{application.student.authorized_alternative_email}</strong> (Admin Authorized)</span>
                </div>
              )}
            </div>

            {/* Section Information: Previous Section and Desired Section */}
            <div className="flex items-center gap-3 pt-1 text-xs font-mono">
              <span className="text-[#8e9db2]">Section Cohort:</span>
              <span className="px-2 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c] text-white">
                Previous: <strong className="text-slate-200">{application.registration.previous_section || "69_K"}</strong>
              </span>
              <span className="text-slate-600">&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c] text-emerald-400">
                Desired: <strong className="text-emerald-400">{application.registration.desired_section || "69_D"}</strong>
              </span>
            </div>
          </div>

          {/* Academic & Accounts Standing */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-[#0b0f19] p-3 rounded-xl border border-[#1c263c] shrink-0">
            <div>
              <span className="text-slate-500 text-[10px] block">CGPA:</span>
              <strong className={application.isProbation ? "text-rose-400 font-bold" : "text-white"}>
                {application.student.cgpa?.toFixed(2)} / 4.00
              </strong>
            </div>
            <div className="h-6 w-px bg-[#1c263c]" />
            <div>
              <span className="text-slate-500 text-[10px] block">Passed:</span>
              <span className="text-slate-300">{application.student.completed_credits} Cr</span>
            </div>
            <div className="h-6 w-px bg-[#1c263c]" />
            <div>
              <span className="text-slate-500 text-[10px] block">Proposed:</span>
              <span className={isOverloaded ? "text-rose-400 font-bold" : "text-emerald-400"}>
                {totalCredits.toFixed(1)} / {creditRules.maxCredits.toFixed(1)} Cr
              </span>
            </div>
            <div className="h-6 w-px bg-[#1c263c]" />
            <div>
              <span className="text-slate-500 text-[10px] block">Accounts Status:</span>
              {application.registration.payment_cleared ? (
                <span className="text-emerald-400 font-medium">Cleared</span>
              ) : (
                <span className="text-rose-400 font-medium">Payment Hold</span>
              )}
            </div>
          </div>
        </div>

        {/* Warning Flags Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1c263c] text-xs">
          {application.isProbation && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
              <AlertTriangle className="h-3 w-3" />
              Academic Probation Warning (Capped at 9.0 Cr)
            </span>
          )}
          {application.hasPrerequisiteConflict && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
              <AlertTriangle className="h-3 w-3" />
              Missing Prerequisite Course
            </span>
          )}
          {application.registration.payment_cleared ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
              <ShieldCheck className="h-3 w-3" />
              Accounts Clearance: {application.registration.payment_reference || "DIU-AC-2027-4561"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
              <AlertTriangle className="h-3 w-3" />
              Tuition Clearance Hold
            </span>
          )}
          <span className="text-slate-500 font-mono text-[11px] ml-auto">
            Submitted: {application.formattedApplicationDate || "Apr 14, 2027 • 2:30 PM"}
          </span>
        </div>
      </div>

      {/* 2. Advising Slip Audit Table (Complete Course List with General/Retake classification) */}
      <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-[#1c263c] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <span>Requested Course Offerings</span>
            <span className="text-[11px] font-mono text-[#8e9db2]">
              ({items.length} Courses • {totalCredits.toFixed(1)} Credits • {generalCount} General, {retakeCount} Retake)
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400">
            {ACTIVE_MOCK_SEMESTER_LABEL} Advising Session
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] border-b border-[#1c263c] font-mono text-[11px] text-[#8e9db2]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Course Code & Title</th>
                <th className="py-2.5 px-3 font-medium w-16 text-center">Cr</th>
                <th className="py-2.5 px-3 font-medium w-28">Course Type</th>
                <th className="py-2.5 px-3 font-medium w-36">Prerequisites</th>
                <th className="py-2.5 px-3 font-medium w-48">Assigned Section</th>
                <th className="py-2.5 px-3 font-medium">Instructor & Room</th>
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
                  <tr key={it.item.id} className="hover:bg-[#172136]/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {it.course.code}
                      </div>
                      <div className="text-slate-200 font-medium">
                        {it.course.title}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {(it.section.credits || it.course.credits).toFixed(1)}
                    </td>

                    {/* General vs Retake Classification */}
                    <td className="py-2.5 px-3">
                      {isRetake ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/70 border border-amber-800 text-amber-300">
                          Retake
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950/70 border border-blue-800 text-blue-300">
                          General
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                          <Check className="h-3 w-3" />
                          Satisfied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-mono font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Missing: {missingCodes.join(", ")}
                        </span>
                      )}
                    </td>

                    {/* Reassign Section dropdown */}
                    <td className="py-2.5 px-3">
                      {availableSections.length > 1 ? (
                        <select
                          value={it.section.id}
                          onChange={(e) => handleReassignSection(it.course.id, it.section.id, e.target.value)}
                          className="w-full text-xs font-mono bg-[#0b0f19] border border-[#1c263c] rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        <span className="font-mono text-xs text-slate-300">
                          Sec {it.section.section_name} (Only Section)
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-300 text-xs">
                      <div className="font-medium text-slate-200">{it.section.instructor_name || "Assigned Faculty"}</div>
                      <div className="text-slate-500 text-[11px]">Room: {it.section.room || "TBA"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Determination Actions & Advisor Remarks */}
      <div className="p-4 rounded-xl border border-[#1c263c] bg-[#121827] space-y-3">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium mb-1">
            Faculty Advising Remarks / Student Instructions:
          </label>
          <textarea
            value={advisorNotes}
            onChange={(e) => setAdvisorNotes(e.target.value)}
            placeholder="Enter academic feedback, section override rationale, or specific revision directives for this advisee..."
            rows={2}
            className="w-full p-2.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1c263c]">
          <div className="text-xs text-[#8e9db2] font-mono">
            Status: <strong className="text-white">{currentStatus}</strong> • Finalizing updates university enrollment records.
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(true)}
              className="border-rose-900/60 text-rose-300 hover:bg-rose-950/40 text-xs h-8 px-3 rounded-lg"
            >
              Request Revisions
            </Button>
            <Button
              size="sm"
              onClick={() => setIsApproveOpen(true)}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium h-8 px-4 rounded-lg shadow-sm"
            >
              Approve Registration
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Approve Registration */}
      <Dialog open={isApproveOpen} onClose={() => setIsApproveOpen(false)}>
        <DialogContent className="border-[#1c263c] bg-[#121827] text-slate-100 max-w-md">
          <DialogHeader className="border-b border-[#1c263c] pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Authorize Course Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8e9db2]">
              Confirm official enrollment authorization for {ACTIVE_MOCK_SEMESTER_LABEL}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-3 text-xs">
            <div className="p-3 bg-[#0b0f19] rounded-lg border border-[#1c263c] space-y-1 font-mono text-[11px]">
              <div>Student: <strong className="text-white">{application.student.full_name}</strong></div>
              <div>ID: <strong className="text-emerald-400">{application.student.diu_id}</strong></div>
              <div>Cohort: <strong className="text-white">{application.registration.previous_section || "69_K"} &rarr; {application.registration.desired_section || "69_D"}</strong></div>
              <div>Authorized Credits: <strong className="text-white">{totalCredits.toFixed(1)} Credit Hours ({items.length} Courses)</strong></div>
              <div>Classification: <strong className="text-slate-300">{generalCount} General • {retakeCount} Retake</strong></div>
              <div>Accounts Clearance: <strong className="text-emerald-400">{application.registration.payment_cleared ? "Verified" : "Pending Hold"}</strong></div>
            </div>

            {!application.registration.payment_cleared && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                ⚠️ Caution: This student has not cleared tuition accounts dues. Authorizing will bypass the financial hold.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#1c263c] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              className="text-xs border-[#1c263c] text-slate-300 hover:bg-[#1a233a] h-8 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleConfirmApproval}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium h-8 px-4 rounded-lg"
            >
              {isProcessing ? "Authorizing..." : "Authorize & Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Request Revisions */}
      <Dialog open={isRejectOpen} onClose={() => setIsRejectOpen(false)}>
        <DialogContent className="border-[#1c263c] bg-[#121827] text-slate-100 max-w-md">
          <DialogHeader className="border-b border-[#1c263c] pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Return Advising Slip for Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8e9db2]">
              The student will be notified to adjust course sections based on your remarks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px] font-mono">
                Primary Reason for Revision:
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs font-mono bg-[#0b0f19] border border-[#1c263c] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="PREREQUISITE_DEFICIENCY">Prerequisite Not Met</option>
                <option value="SECTION_ADJUSTMENT">Section Reassignment Required</option>
                <option value="SECTION_CAPACITY">Section Capacity Limit Exceeded</option>
                <option value="CREDIT_OVERLOAD">Exceeds Maximum Permitted Credits</option>
                <option value="TUITION_HOLD">Accounts Tuition Payment Incomplete</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 text-[11px] font-mono">
                Mandatory Feedback to Student:
              </label>
              <textarea
                value={advisorNotes}
                onChange={(e) => setAdvisorNotes(e.target.value)}
                placeholder="Explain the required course/section changes..."
                rows={2}
                className="w-full p-2.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#1c263c] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              className="text-xs border-[#1c263c] text-slate-300 hover:bg-[#1a233a] h-8 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={handleConfirmRejection}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium h-8 rounded-lg"
            >
              {isProcessing ? "Returning..." : "Return Slip to Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
