"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_ADVISOR_PROFILE,
  MOCK_UNAPPLIED_STUDENTS,
  ACTIVE_MOCK_SEMESTER_LABEL,
} from "@/lib/mock/data";
import {
  Users,
  Clock,
  CheckCircle2,
  FileCheck2,
  Search,
  ArrowRight,
  AlertCircle,
  RotateCw,
  Calendar,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdvisorDashboardView() {
  const [searchInput, setSearchInput] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("ALL");

  const rawQueue = MOCK_ADVISEE_QUEUE;
  
  // Real-time counts computed from actual advisee queue and assignments
  const pendingApps = React.useMemo(
    () => rawQueue.filter((a) => a.registration.status === "pending_advisor"),
    [rawQueue]
  );
  const inProgressApps = React.useMemo(
    () => rawQueue.filter((a) => a.registration.status === "pending_advisor" && Boolean(a.isUnderReview)),
    [rawQueue]
  );
  const approvedApps = React.useMemo(
    () => rawQueue.filter((a) => a.registration.status === "approved"),
    [rawQueue]
  );
  const notAppliedCount = MOCK_UNAPPLIED_STUDENTS.length;
  const totalAssigned = pendingApps.length + approvedApps.length + notAppliedCount;

  // Filter pending applications requiring review
  const filteredPriorityApps = React.useMemo(() => {
    return pendingApps.filter((app) => {
      const q = searchInput.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        app.student.full_name.toLowerCase().includes(q) ||
        (app.student.diu_id && app.student.diu_id.toLowerCase().includes(q));

      let matchesBatch = true;
      if (batchFilter !== "ALL") {
        matchesBatch = app.student.batch === batchFilter;
      }

      return matchesSearch && matchesBatch;
    });
  }, [pendingApps, searchInput, batchFilter]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* 1. Header with Faculty Identity and Active Term */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c263c] pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome, {MOCK_ADVISOR_PROFILE.full_name}
          </h1>
          <p className="text-sm text-slate-300">
            Faculty Academic Advisor • Department of Computer Science & Engineering
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121827] border border-[#1c263c] text-xs font-mono text-slate-200">
            <Calendar className="h-4 w-4 text-[#008764]" />
            <span>Academic Term:</span>
            <strong className="text-white font-semibold">{ACTIVE_MOCK_SEMESTER_LABEL} (Active)</strong>
          </div>
        </div>
      </div>

      {/* 2. Four Actionable Stat Cards linking to Application Center Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Applications */}
        <Link
          href="/advisor/queue"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] border-l-4 border-l-amber-500 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-amber-400 transition-colors">
              Pending
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {pendingApps.length}
            </div>
            <div className="text-xs text-amber-400/90 font-medium">
              Awaiting faculty review
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
        </Link>

        {/* Card 2: In Progress Applications */}
        <Link
          href="/advisor/queue"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] border-l-4 border-l-sky-500 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-sky-400 transition-colors">
              In Progress
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {inProgressApps.length}
            </div>
            <div className="text-xs text-sky-400/90 font-medium">
              Actively under audit
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <RotateCw className="h-6 w-6 text-sky-400" />
          </div>
        </Link>

        {/* Card 3: Approved Applications */}
        <Link
          href="/advisor/queue"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] border-l-4 border-l-emerald-500 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition-colors">
              Approved
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {approvedApps.length}
            </div>
            <div className="text-xs text-emerald-400/90 font-medium">
              Officially finalized
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
        </Link>

        {/* Card 4: Not Applied */}
        <Link
          href="/advisor/queue"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] border-l-4 border-l-slate-600 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
              Not Applied
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {notAppliedCount}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Assigned advisees ({totalAssigned} total)
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6 text-slate-300" />
          </div>
        </Link>
      </div>

      {/* 3. Actionable Priority Section: Pending Applications Requiring Action */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#172136] border border-[#25324d] flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pending Applications Requiring Action
              </h2>
              <p className="text-xs text-slate-300">
                Course registration requests submitted by your assigned students awaiting departmental determination.
              </p>
            </div>
          </div>

          <Button asChild size="sm" variant="outline" className="border-[#1c263c] bg-[#0b0f19] hover:bg-[#151c2d] text-slate-200 text-xs self-start sm:self-center">
            <Link href="/advisor/queue" className="flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4 text-[#008764]" />
              <span>Open Application Center</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search pending applications by student name or DIU ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Batch Selector */}
          <div className="w-full sm:w-48">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full bg-[#0b0f19] border border-[#1c263c] text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Enrolled Batches</option>
              <option value="60">Batch 60</option>
              <option value="61">Batch 61</option>
              <option value="59">Batch 59</option>
            </select>
          </div>
        </div>

        {/* High-density Priority Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1c263c] bg-[#0b0f19]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121827] border-b border-[#1c263c] text-slate-400 font-semibold tracking-wider uppercase text-xs">
              <tr>
                <th scope="col" className="py-3 px-4">Student Information</th>
                <th scope="col" className="py-3 px-3">Batch & Dept</th>
                <th scope="col" className="py-3 px-3 text-center">CGPA & Credits</th>
                <th scope="col" className="py-3 px-3 text-center">Section Cohort</th>
                <th scope="col" className="py-3 px-3 text-center">Proposed Load</th>
                <th scope="col" className="py-3 px-3 text-center">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Primary Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {filteredPriorityApps.map((app) => {
                const isUnderReview = Boolean(app.isUnderReview);
                const prevSec = app.registration.previous_section || "69_K";
                const desiredSec = app.registration.desired_section || "69_D";

                return (
                  <tr
                    key={app.registration.id}
                    className="hover:bg-[#121827]/70 transition-colors"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-sm">
                        {app.student.full_name}
                      </div>
                      <div className="font-mono text-emerald-400 text-xs font-medium">
                        {app.student.diu_id}
                      </div>
                      <div className="text-slate-400 text-xs truncate max-w-[220px]">
                        {app.student.email}
                      </div>
                    </td>

                    {/* Batch & Dept */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-200">
                        {app.student.batch || "60th Batch"}
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        {app.student.department_code || "CSE"}
                      </div>
                    </td>

                    {/* CGPA & Passed Credits */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <div className="font-bold text-white text-sm">
                        {app.student.cgpa?.toFixed(2) || "3.50"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {app.student.completed_credits || 0} Cr Passed
                      </div>
                    </td>

                    {/* Section Cohort */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121827] border border-[#1c263c]">
                        <span className="text-slate-300">{prevSec}</span>
                        <span className="text-slate-500">&rarr;</span>
                        <strong className="text-emerald-400 font-bold">{desiredSec}</strong>
                      </div>
                    </td>

                    {/* Proposed Load */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <div className="font-bold text-white">
                        {app.totalCourses} Courses
                      </div>
                      <div className="text-xs text-emerald-400">
                        {app.totalCredits.toFixed(1)} Cr
                      </div>
                      <div className="text-xs text-slate-400">
                        {app.generalCourseCount || 3} Gen • {app.retakeCourseCount || 1} Ret
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {isUnderReview ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-950/80 border border-sky-800 text-sky-300">
                          <RotateCw className="h-3 w-3" />
                          <span>In Progress</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 border border-amber-800 text-amber-300">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        asChild
                        size="sm"
                        className="h-8 px-3.5 bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        <Link href={`/advisor/review/${app.registration.id}`}>
                          <span>{isUnderReview ? "Continue Review" : "Review Application"}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1 text-white" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredPriorityApps.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-white text-sm">No Pending Applications Requiring Action</p>
                    <p className="text-slate-400 mt-1">All submitted applications for this term have been reviewed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredPriorityApps.length}</strong> of {pendingApps.length} pending applications
          </div>
          <Link
            href="/advisor/queue"
            className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>View All Three Categories in Application Center</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. Quick Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Module 1: Application Center */}
        <Link
          href="/advisor/queue"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] rounded-2xl p-5 space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#172136] border border-[#25324d] flex items-center justify-center text-[#008764]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
            Application Center
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Manage your full advisee queue partitioned into three categories: Pending, Approved, and Not Applied.
          </p>
        </Link>

        {/* Module 2: My Assigned Students */}
        <Link
          href="/advisor/students"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] rounded-2xl p-5 space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#172136] border border-[#25324d] flex items-center justify-center text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
            My Assigned Students
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Inspect all assigned students, completed credits, CGPA standings, and direct communication channels.
          </p>
        </Link>

        {/* Module 3: Review History */}
        <Link
          href="/advisor/history"
          className="bg-[#121827] hover:bg-[#151c2d] border border-[#1c263c] rounded-2xl p-5 space-y-2 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#172136] border border-[#25324d] flex items-center justify-center text-purple-400">
              <History className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
            Review History
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Audit permanent records of all signed advising determinations, timestamped actions, and student directives.
          </p>
        </Link>
      </div>
    </div>
  );
}
