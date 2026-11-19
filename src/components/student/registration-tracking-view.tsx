"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISOR_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
  MOCK_ADVISEE_QUEUE,
} from "@/lib/mock/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  User,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { RegistrationStatus } from "@/types/database";

export interface SubmittedRegistrationSummary {
  id: string;
  status: RegistrationStatus;
  previous_section?: string;
  desired_section?: string;
  reference_id?: string;
  submitted_at?: string;
  advisor_notes?: string | null;
  courses?: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    credits: number;
    sectionId: string;
    sectionName: string;
    courseType: "general" | "retake";
  }>;
  totalCredits?: number;
  generalCourseCount?: number;
  retakeCourseCount?: number;
}

interface RegistrationTrackingViewProps {
  initialRegistration?: SubmittedRegistrationSummary | null;
}

export function RegistrationTrackingView({ initialRegistration }: RegistrationTrackingViewProps) {
  // Check if there is an in-memory application for demo student (reg-app-siyam)
  const siyamApp = MOCK_ADVISEE_QUEUE.find((a) => a.registration.student_id === "student-siyam-01");

  const reg: SubmittedRegistrationSummary = initialRegistration || {
    id: siyamApp?.registration.id || "REG-2027-SP-7819",
    status: (siyamApp?.registration.status as RegistrationStatus) || "pending_advisor",
    previous_section: siyamApp?.registration.previous_section || "69_K",
    desired_section: siyamApp?.registration.desired_section || "69_D",
    reference_id: siyamApp?.registration.payment_reference || "REG-2027-SP-7819",
    submitted_at: siyamApp?.registration.submitted_at || "2027-04-14T15:00:00Z",
    advisor_notes: siyamApp?.registration.advisor_notes || null,
    courses: siyamApp?.items.map((it) => ({
      courseId: it.course.id,
      courseCode: it.course.code,
      courseTitle: it.course.title,
      credits: it.section.credits || it.course.credits,
      sectionId: it.section.id,
      sectionName: it.section.section_name,
      courseType: (it.course_type || "general") as "general" | "retake",
    })) || [
      { courseId: "1", courseCode: "CSE221", courseTitle: "Algorithms Design and Analysis", credits: 3.0, sectionId: "1", sectionName: "69_D", courseType: "general" },
      { courseId: "2", courseCode: "CSE222", courseTitle: "Algorithms Lab", credits: 1.5, sectionId: "2", sectionName: "69_D_L", courseType: "general" },
      { courseId: "3", courseCode: "CSE225", courseTitle: "Database Management Systems", credits: 3.0, sectionId: "3", sectionName: "69_D", courseType: "general" },
      { courseId: "4", courseCode: "CSE110", courseTitle: "Structured Programming Language", credits: 3.0, sectionId: "4", sectionName: "69_D", courseType: "retake" },
    ],
    totalCredits: siyamApp?.totalCredits || 10.5,
    generalCourseCount: siyamApp?.generalCourseCount || 3,
    retakeCourseCount: siyamApp?.retakeCourseCount || 1,
  };

  const isApproved = reg.status === "approved";
  const isRejected = reg.status === "rejected";
  const isPending = reg.status === "pending_advisor";

  const steps = [
    {
      title: "Course Selection & Section Setup",
      description: `Sections ${reg.previous_section || "69_K"} \u2192 ${reg.desired_section || "69_D"} chosen, prerequisites checked.`,
      timestamp: "Step 1 • Completed",
      isDone: true,
      isCurrent: false,
    },
    {
      title: "Advising Request Submitted",
      description: "Application locked and forwarded to assigned academic advisor.",
      timestamp: "Step 2 • Completed",
      isDone: true,
      isCurrent: false,
    },
    {
      title: "Faculty Academic Audit",
      description: "Faculty review of prerequisites, degree progression, and seat availability.",
      timestamp: isApproved || isRejected ? "Audit Completed" : "In Progress • Faculty Review",
      isDone: isApproved,
      isCurrent: isPending,
      isFailed: isRejected,
    },
    {
      title: "Official Term Enrollment",
      description: "Courses officially registered into university database and ERP.",
      timestamp: isApproved ? "Officially Enrolled" : isRejected ? "Revisions Required" : "Pending Authorization",
      isDone: isApproved,
      isCurrent: false,
    },
  ];

  return (
    <div className="space-y-5 text-slate-100 max-w-5xl mx-auto py-2">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-[#121827] border border-[#1c263c] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-emerald-400" />
              Advising Application Status
            </h1>
            <Badge variant="outline" className="border-emerald-800 bg-emerald-950/60 text-emerald-400 text-[10px] uppercase font-mono py-0.5 px-2">
              {ACTIVE_MOCK_SEMESTER_LABEL}
            </Badge>
          </div>
          <p className="text-xs text-[#8e9db2] mt-1">
            Real-time tracking of your {ACTIVE_MOCK_SEMESTER_LABEL} course registration application through faculty audit.
          </p>
        </div>

        <StatusBadge status={reg.status} className="text-xs py-1 px-3 shrink-0" />
      </div>

      {/* Revision Alert if Rejected */}
      {isRejected && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Advising Slip Returned for Academic Revision</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Remarks from your advisor: <strong className="text-rose-200">{reg.advisor_notes || "Please adjust course sections or consult during routine office hours."}</strong>
          </p>
          <div className="pt-1">
            <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-8">
              <Link href="/courses">
                Modify Course Registration &rarr;
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Main Status Stepper Card */}
      <Card className="border-[#1c263c] bg-[#121827] shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-[#1c263c]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              Application Workflow Progress
            </CardTitle>
            <span className="font-mono text-xs text-emerald-400">
              {reg.reference_id || "REG-2027-SP-7819"}
            </span>
          </div>
          <CardDescription className="text-xs text-[#8e9db2]">
            Assigned to <strong>{MOCK_ADVISOR_PROFILE.full_name}</strong> • Dept. of Computer Science & Engineering
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#1c263c]">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4 pl-2">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                    step.isDone
                      ? "bg-[#008764] text-white"
                      : step.isCurrent
                      ? "bg-amber-500 text-white ring-4 ring-amber-950 animate-pulse"
                      : (step as { isFailed?: boolean }).isFailed
                      ? "bg-rose-600 text-white"
                      : "bg-[#1c263c] text-slate-400"
                  }`}
                >
                  {step.isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="text-sm font-semibold text-white">
                      {step.title}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {step.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e9db2]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Details & Application Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assigned Faculty Card */}
        <Card className="border-[#1c263c] bg-[#121827] shadow-sm">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Assigned Reviewing Faculty</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2.5 text-xs text-slate-300">
            <div className="p-3 bg-[#0b0f19] rounded-xl border border-[#1c263c] space-y-1">
              <div className="font-bold text-sm text-white">
                {MOCK_ADVISOR_PROFILE.full_name}
              </div>
              <div className="text-[#8e9db2] text-xs">
                Associate Professor & Faculty Advisor, Dept. of CSE
              </div>
              <div className="text-emerald-400 font-mono text-xs">
                {MOCK_ADVISOR_PROFILE.email}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#1c263c] bg-[#0b0f19] text-[#8e9db2] space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Office Consultation Hours</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Sun & Tue: 10:00 AM – 12:00 PM • Room 612, AB-04, Daffodil Smart City.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section & Courses Details */}
        <Card className="border-[#1c263c] bg-[#121827] shadow-sm">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Submitted Slip ({reg.courses?.length || 0} Courses • {reg.totalCredits?.toFixed(1) || "10.5"} Cr)</span>
              </CardTitle>
              <span className="font-mono text-[11px] text-slate-400">
                {reg.generalCourseCount || 0} Gen • {reg.retakeCourseCount || 0} Retake
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {/* Cohort Section pill */}
            <div className="p-2.5 rounded-lg border border-[#1c263c] bg-[#0b0f19] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8e9db2]">Assigned Sections:</span>
              <span>
                <strong className="text-slate-300">{reg.previous_section || "69_K"}</strong>
                <span className="text-slate-600 mx-2">&rarr;</span>
                <strong className="text-emerald-400">{reg.desired_section || "69_D"}</strong>
              </span>
            </div>

            {/* Courses items */}
            {reg.courses && reg.courses.map((c, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-[#1c263c] bg-[#0b0f19] flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-400">
                      {c.courseCode}
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      Sec {c.sectionName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({c.credits} Cr)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8e9db2] truncate">
                    {c.courseTitle}
                  </div>
                </div>

                {c.courseType === "retake" ? (
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-800 bg-amber-950/60 text-amber-300 shrink-0">
                    Retake
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-mono border-blue-800 bg-blue-950/60 text-blue-300 shrink-0">
                    General
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
