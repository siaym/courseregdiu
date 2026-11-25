"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  AlertCircle,
  User as UserIcon,
  Mail,
  Info,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Phone,
  MapPin,
} from "lucide-react";
import type { Database, RegistrationStatus } from "@/types/database";
import type { PaymentClearanceRecord } from "@/lib/payment/payment-service";

type StudentLifecycleState = "draft" | "submitted" | "approved";

export interface AssignedAdvisorSummary {
  fullName: string;
  designation?: string | null;
  email: string;
  phone?: string | null;
  departmentCode: string | null;
  roomNumber: string | null;
  schedule?: string | null;
}

interface StudentHomeViewProps {
  profile?: Database["public"]["Tables"]["profiles"]["Row"];
  paymentClearance?: PaymentClearanceRecord | null;
  assignedAdvisor?: AssignedAdvisorSummary | null;
  activeSemesterLabel?: string;
  registrationWindowLabel?: string;
  registrationStatus?: RegistrationStatus | "not_submitted";
  isDev?: boolean;
}

export function StudentHomeView({
  profile,
  paymentClearance,
  assignedAdvisor = null,
  activeSemesterLabel = "No Active Semester",
  registrationWindowLabel = "Schedule pending",
  registrationStatus = "not_submitted",
  isDev = false,
}: StudentHomeViewProps) {
  const initialState: StudentLifecycleState =
    registrationStatus === "approved"
      ? "approved"
      : registrationStatus === "pending_advisor"
      ? "submitted"
      : "draft";
  const [activeState, setActiveState] = React.useState<StudentLifecycleState>(initialState);
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  return (
    <div className="space-y-6 text-slate-100 max-w-5xl mx-auto py-2">
      {/* Dev Preview Helper (Dev only) */}
      {isDev && (
        <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-[#121827] border border-[#1c263c] text-[#8e9db2]">
          <span className="font-mono text-[11px]">Lifecycle Preview:</span>
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {(["draft", "submitted", "approved"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setActiveState(st)}
                className={`px-2.5 py-0.5 rounded-lg capitalize transition-colors ${
                  activeState === st
                    ? "bg-[#172136] text-white font-medium shadow-xs"
                    : "text-[#8e9db2] hover:text-white"
                }`}
              >
                {st === "draft" ? "Not Submitted (Draft)" : st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Greeting Header (Exact match to Mockup 1) */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""},
        </h1>
        <p className="text-sm text-[#8e9db2]">
          Your registration is ready to continue.
        </p>
      </div>

      {/* Hero Action Card: Course Registration (Exact match to Mockup 1) */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          {/* Rounded Icon Box */}
          <div className="w-14 h-14 rounded-2xl bg-[#1a233a] border border-[#25324d] flex items-center justify-center shrink-0">
            <BookOpen className="h-7 w-7 text-sky-400" />
          </div>

          <div className="space-y-1">
            {/* Registration Open Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#062822] border border-[#064e3b] text-[#10b981] text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span>Registration Open</span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Course Registration
            </h2>
            <p className="text-xs text-[#8e9db2]">
              Select your courses and preferred sections for this semester.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 self-stretch sm:self-center">
          <Link
            href="/courses"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
          >
            <span>Continue Registration</span>
            <ArrowRight className="h-4 w-4 text-[#0b0f19]" />
          </Link>
        </div>
      </div>

      {/* Three-Column Middle Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Registration Status */}
        <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="text-xs font-medium text-[#8e9db2]">
            Registration Status
          </div>

          <div className="flex items-start gap-4">
            {activeState === "draft" && (
              <>
                <AlertCircle className="h-10 w-10 text-[#f59e0b] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-[#f59e0b]">
                    Not Submitted
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    Your advisor will review your application after submission.
                  </p>
                </div>
              </>
            )}

            {activeState === "submitted" && (
              <>
                <div className="h-10 w-10 rounded-full bg-sky-950/60 border border-sky-800 flex items-center justify-center shrink-0">
                  <div className="h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-sky-400">
                    Pending Advisor Review
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    Submitted on Apr 14, 2027. Awaiting departmental verification.
                  </p>
                </div>
              </>
            )}

            {activeState === "approved" && (
              <>
                <CheckCircle2 className="h-10 w-10 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-emerald-400">
                    Officially Approved
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    All course sections enrolled. Enrollment slip is finalized.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Tuition Accounts Clearance */}
        <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="text-xs font-medium text-[#8e9db2]">
            Tuition Accounts Status
          </div>

          <div className="flex items-start gap-4">
            {(!paymentClearance || paymentClearance.status === "awaiting_verification") && (
              <>
                <Clock className="h-10 w-10 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-amber-400">
                    Awaiting Verification
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    {paymentClearance?.referenceCode
                      ? `Voucher: ${paymentClearance.referenceCode}`
                      : "Pending Accounts office verification"}
                  </p>
                </div>
              </>
            )}

            {paymentClearance?.status === "cleared" && (
              <>
                <ShieldCheck className="h-10 w-10 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-emerald-400">
                    Payment Cleared
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    Verified by Accounts{paymentClearance.referenceCode ? ` (${paymentClearance.referenceCode})` : ""}.
                  </p>
                </div>
              </>
            )}

            {paymentClearance?.status === "not_cleared" && (
              <>
                <AlertCircle className="h-10 w-10 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-rose-400">
                    Financial Hold
                  </div>
                  <p className="text-xs text-[#8e9db2] leading-relaxed">
                    Tuition hold: Contact Finance & Accounts office.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Your Advisor */}
        <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="text-xs font-medium text-[#8e9db2]">
            Your Advisor
          </div>

          {assignedAdvisor ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-300 shrink-0">
                    <UserIcon className="h-6 w-6 text-slate-300" />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white">
                      {assignedAdvisor.fullName}
                    </div>
                    <div className="text-xs text-[#8e9db2]">
                      {[
                        assignedAdvisor.designation,
                        assignedAdvisor.departmentCode
                          ? `Department of ${assignedAdvisor.departmentCode}`
                          : "Assigned Faculty Advisor",
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                </div>

                <a
                  href={`mailto:${assignedAdvisor.email}?subject=DIU%20Course%20Registration%20Inquiry`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293c] text-white text-xs font-medium transition-colors shadow-xs shrink-0"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-300" />
                  <span>Contact</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-[#1c263c] text-xs text-slate-300">
                <div className="flex items-center gap-2 font-mono min-w-0">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{assignedAdvisor.email}</span>
                </div>
                {assignedAdvisor.phone && (
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${assignedAdvisor.phone}`} className="hover:text-white transition-colors">
                      {assignedAdvisor.phone}
                    </a>
                  </div>
                )}
                {assignedAdvisor.roomNumber && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Room: {assignedAdvisor.roomNumber}</span>
                  </div>
                )}
                {assignedAdvisor.schedule && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{assignedAdvisor.schedule}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-slate-400 shrink-0">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Not Yet Assigned
                </div>
                <div className="text-xs text-[#8e9db2]">
                  Your department will assign an academic advisor for {activeSemesterLabel}.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Card: Important Information (Exact match to Mockup 1) */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
            <span className="font-semibold text-white">Important Information</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-[#8e9db2]">
              Registration window:{" "}
              <strong className="text-slate-200 font-medium">{registrationWindowLabel}</strong> |{" "}
              Current Semester:{" "}
              <strong className="text-slate-200 font-medium">{activeSemesterLabel}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Details Dialog (when View Details is clicked) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-[#1c263c] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" />
                <span>DIU Academic Advising Regulations</span>
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-[#8e9db2] hover:text-white px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-[#8e9db2]">
              <p>
                • <strong className="text-white">Active Advising Window:</strong> {registrationWindowLabel}. Submissions after this date require Department Head approval.
              </p>
              <p>
                • <strong className="text-white">Credit Hour Limits:</strong> Regular full-time students are permitted to take up to 15.0 credits per standard DIU semester.
              </p>
              <p>
                • <strong className="text-white">Prerequisites:</strong> Prerequisite courses must have a passing grade before upper-tier courses can be authorized.
              </p>
              <p>
                • <strong className="text-white">Advisor Office Hours:</strong> Sunday & Tuesday, 10:00 AM – 1:00 PM (Room 612, AB-04, Daffodil Smart City).
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-[#172136] text-white rounded-xl text-xs font-medium hover:bg-[#1e293b] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
