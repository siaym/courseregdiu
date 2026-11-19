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
  formatScheduleSlot,
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
} from "lucide-react";

export interface AdvisorReviewViewProps {
  registrationId: string;
}

export function AdvisorReviewView({ registrationId }: AdvisorReviewViewProps) {
  const router = useRouter();

  // Find application in mock queue or fallback to first
  const initialApp =
    MOCK_ADVISEE_QUEUE.find((a) => a.registration.id === registrationId) ||
    MOCK_ADVISEE_QUEUE[0];

  const application = initialApp;
  const [items, setItems] = React.useState(initialApp.items);
  const [advisorNotes, setAdvisorNotes] = React.useState(initialApp.registration.advisor_notes || "");
  const [currentStatus, setCurrentStatus] = React.useState(initialApp.registration.status);

  // Queue paging navigation
  const currentIndex = MOCK_ADVISEE_QUEUE.findIndex((a) => a.registration.id === application.registration.id);
  const prevApp = currentIndex > 0 ? MOCK_ADVISEE_QUEUE[currentIndex - 1] : null;
  const nextApp = currentIndex < MOCK_ADVISEE_QUEUE.length - 1 ? MOCK_ADVISEE_QUEUE[currentIndex + 1] : null;

  // Dialog states
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
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

  // Section Reassignment handler
  const handleReassignSection = (courseId: string, currentSectionId: string, newSectionId: string) => {
    const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
    if (!newSection) return;

    setItems((prev) =>
      prev.map((it) => (it.section.id === currentSectionId ? { ...it, section: newSection } : it))
    );

    setToastMessage({
      text: `Reassigned ${newSection.course_code} to Section ${newSection.section_name}.`,
      type: "success",
    });
  };

  // Finalize Approval
  const handleConfirmApproval = () => {
    setCurrentStatus("approved");
    setIsApproveOpen(false);
    setToastMessage({
      text: `Application for ${application.student.full_name} (${application.student.diu_id}) approved and officially authorized.`,
      type: "success",
    });
  };

  // Finalize Rejection / Revision Request
  const handleConfirmRejection = () => {
    setCurrentStatus("rejected");
    setIsRejectOpen(false);
    setToastMessage({
      text: `Advising slip returned to ${application.student.full_name} with requested adjustments.`,
      type: "destructive",
    });
  };

  const totalCredits = items.reduce((sum, it) => sum + it.course.credits, 0);
  const creditRules = getCreditLimitByCgpa(application.student.cgpa);
  const isOverloaded = totalCredits > creditRules.maxCredits;

  return (
    <div className="space-y-4 text-slate-100 max-w-6xl mx-auto py-2">
      {/* Top Bar: Queue Navigation & Keyboard Hints */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-800">
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
            <Button asChild size="sm" variant="outline" className="border-slate-800 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 h-7 px-2.5">
              <Link href={`/advisor/review/${prevApp.registration.id}`}>
                &larr; Prev
              </Link>
            </Button>
          )}
          {nextApp && (
            <Button asChild size="sm" variant="outline" className="border-slate-800 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 h-7 px-2.5">
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
          className={`flex items-center justify-between p-3 rounded-md border text-xs animate-in fade-in duration-100 ${
            toastMessage.type === "success"
              ? "bg-slate-900 border-emerald-800 text-emerald-300"
              : "bg-slate-900 border-rose-800 text-rose-300"
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

      {/* Student Metadata Bar (High information density, zero fluff) */}
      <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/80 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {application.student.full_name}
              </h2>
              <span className="font-mono text-xs font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                {application.student.diu_id}
              </span>
              <span className="text-xs text-slate-400">
                Dept. of {application.student.department_code} • {application.student.batch || "58th Batch"}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Email: {application.student.email} • Mobile: {application.student.phone || "+8801712345678"}
            </div>
          </div>

          {/* Academic & Accounts Standing */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
            <div>
              <span className="text-slate-500 text-[10px] block">CGPA:</span>
              <strong className={application.isProbation ? "text-rose-400 font-bold" : "text-white"}>
                {application.student.cgpa?.toFixed(2)} / 4.00
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 text-[10px] block">Passed:</span>
              <span className="text-slate-300">{application.student.completed_credits} Cr</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 text-[10px] block">Proposed:</span>
              <span className={isOverloaded ? "text-rose-400 font-bold" : "text-emerald-400"}>
                {totalCredits.toFixed(1)} / {creditRules.maxCredits.toFixed(1)} Cr
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
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
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
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
              Accounts Clearance: {application.registration.payment_reference || "DIU-AC-2026-8812"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
              <AlertTriangle className="h-3 w-3" />
              Tuition Clearance Hold
            </span>
          )}
        </div>
      </div>

      {/* Advising Slip Audit Table (Stripe tabular excellence) */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-white">
            Requested Course Sections ({items.length} Courses • {totalCredits} Credits)
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {ACTIVE_MOCK_SEMESTER_LABEL} Advising Session
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 font-mono text-[11px] text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-medium">Course Code & Title</th>
                <th className="py-2.5 px-3 font-medium w-16 text-center">Cr</th>
                <th className="py-2.5 px-3 font-medium w-36">Prerequisite Audit</th>
                <th className="py-2.5 px-3 font-medium w-48">Reassign Section</th>
                <th className="py-2.5 px-3 font-medium">Schedule & Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((it) => {
                const { isEligible, missingCodes } = getPrerequisiteStatus(
                  it.course.prerequisite_codes,
                  MOCK_COMPLETED_COURSE_CODES
                );
                const availableSections = MOCK_SECTIONS.filter((s) => s.course_id === it.course.id);

                return (
                  <tr key={it.item.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-emerald-400">
                        {it.course.code}
                      </div>
                      <div className="text-slate-200 font-medium">
                        {it.course.title}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {it.course.credits.toFixed(1)}
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

                    <td className="py-2.5 px-3">
                      {availableSections.length > 1 ? (
                        <select
                          value={it.section.id}
                          onChange={(e) => handleReassignSection(it.course.id, it.section.id, e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      <div>{it.section.schedule.map(formatScheduleSlot).join(", ")}</div>
                      <div className="text-slate-500 text-[10px]">Room: {it.section.room}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Determination Actions & Advisor Notes */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium mb-1">
            Faculty Advising Remarks / Instructions:
          </label>
          <textarea
            value={advisorNotes}
            onChange={(e) => setAdvisorNotes(e.target.value)}
            placeholder="Enter specific academic feedback, prerequisite rationale, or section change notes for this advisee..."
            rows={2}
            className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-mono"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono">
            Status: <strong className="text-slate-200">{currentStatus}</strong> • Finalizing updates university enrollment records.
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(true)}
              className="border-rose-800/80 text-rose-300 hover:bg-rose-950/40 text-xs h-8 px-3"
            >
              Request Revisions
            </Button>
            <Button
              size="sm"
              onClick={() => setIsApproveOpen(true)}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium h-8 px-4"
            >
              Approve Registration
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Approve Registration */}
      <Dialog open={isApproveOpen} onClose={() => setIsApproveOpen(false)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Authorize Course Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Confirm official enrollment authorization for Spring 2026.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
              <div>Student: <strong className="text-white">{application.student.full_name}</strong></div>
              <div>ID: <strong className="text-emerald-400">{application.student.diu_id}</strong></div>
              <div>Authorized Credits: <strong className="text-white">{totalCredits} Credit Hours ({items.length} Courses)</strong></div>
              <div>Accounts Clearance: <strong className="text-emerald-400">{application.registration.payment_cleared ? "Verified" : "Pending Hold"}</strong></div>
            </div>

            {!application.registration.payment_cleared && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                ⚠️ Caution: This student has not cleared tuition accounts dues. Authorizing will bypass the financial hold.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApproval}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium h-8"
            >
              Authorize & Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Request Revisions */}
      <Dialog open={isRejectOpen} onClose={() => setIsRejectOpen(false)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Return Advising Slip for Revisions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
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
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="PREREQUISITE_DEFICIENCY">Prerequisite Not Met</option>
                <option value="SCHEDULE_CONFLICT">Class Timetable Clash</option>
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
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRejection}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium h-8"
            >
              Return Slip to Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
