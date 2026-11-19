"use client";

import * as React from "react";
import {
  MOCK_ADVISOR_PROFILE,
  MOCK_STUDENT_CART_SECTIONS,
} from "@/lib/mock/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  User,
  ShieldCheck,
} from "lucide-react";

export function RegistrationTrackingView() {
  const steps = [
    {
      title: "Course Selection & Draft",
      description: "Sections selected, prerequisites validated.",
      timestamp: "Jan 8, 2026 • 14:15",
      isDone: true,
      isCurrent: false,
    },
    {
      title: "Advising Request Submitted",
      description: "Application locked and forwarded to assigned advisor.",
      timestamp: "Jan 9, 2026 • 08:15",
      isDone: true,
      isCurrent: false,
    },
    {
      title: "Faculty Academic Audit",
      description: "Faculty review of credit limits, prerequisites, and graduation standing.",
      timestamp: "In Progress • Faculty Audit",
      isDone: false,
      isCurrent: true,
    },
    {
      title: "Final Institutional Enrollment",
      description: "Courses officially registered in university database and ERP.",
      timestamp: "Pending Approval",
      isDone: false,
      isCurrent: false,
    },
  ];

  return (
    <div className="space-y-5 text-slate-100 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-emerald-400" />
              Advising Application Status
            </h1>
            <Badge variant="diu" className="text-[10px] uppercase font-mono py-0.5 px-2">
              Spring 2026
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of your Spring 2026 course registration application through faculty verification.
          </p>
        </div>

        <StatusBadge status="pending_advisor" className="text-xs py-1 px-3 shrink-0" />
      </div>

      {/* Main Status Stepper Card */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-xs">
        <CardHeader className="p-4 pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              Application Workflow Progress
            </CardTitle>
            <span className="font-mono text-xs text-emerald-400">
              REG-2026-SP-7819
            </span>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Submitted Jan 9, 2026 • Assigned to Dr. Sheak Rashed Haider Noori
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4 pl-2">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                    step.isDone
                      ? "bg-[#008764] text-white"
                      : step.isCurrent
                      ? "bg-amber-500 text-white ring-4 ring-amber-950 animate-pulse"
                      : "bg-slate-800 text-slate-400"
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
                  <p className="text-xs text-slate-400">
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
        <Card className="border-slate-800 bg-slate-900/90 shadow-xs">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Assigned Reviewing Faculty</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2.5 text-xs text-slate-300">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-sm text-white">
                {MOCK_ADVISOR_PROFILE.full_name}
              </div>
              <div className="text-slate-400 text-xs">
                Associate Professor & Head, Dept. of Computer Science & Engineering
              </div>
              <div className="text-emerald-400 font-mono text-xs">
                {MOCK_ADVISOR_PROFILE.email}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Office Consultation Hours</span>
              </div>
              <p className="text-[11px]">
                Sun & Tue: 10:00 AM – 12:00 PM • Room 612, AB-04, Daffodil Smart City.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Course Sections in Slip */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-xs">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Submitted Sections (4 Courses • 12.0 Cr)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {MOCK_STUDENT_CART_SECTIONS.map((sec) => (
              <div
                key={sec.id}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-400 mr-2">
                    {sec.course_code}
                  </span>
                  <span className="text-slate-200">
                    Sec {sec.section_name}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-300">
                  {sec.credits?.toFixed(1) || "3.0"} Cr
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
