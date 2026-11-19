"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCw,
  ArrowRight,
  Eye,
  Mail,
  Phone,
  User,
  Calendar,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdvisorQueueAction,
} from "@/app/advisor/queue/actions";
import type {
  AdvisorQueueData,
} from "@/lib/advisor/queue-service";
import type { ProfileRow } from "@/lib/mock/data";

interface AdvisorQueueViewProps {
  initialData: AdvisorQueueData;
}

export function AdvisorQueueView({ initialData }: AdvisorQueueViewProps) {
  const [data, setData] = React.useState<AdvisorQueueData>(initialData);
  const [activeTab, setActiveTab] = React.useState<"pending" | "approved" | "not_applied">("pending");
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<string>(
    initialData.selectedSemester.id
  );

  // Search & Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("ALL");
  const [pendingSubStatus, setPendingSubStatus] = React.useState<"ALL" | "PENDING_REVIEW" | "UNDER_REVIEW">("ALL");

  // Loading & State
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Advising Details Modal State (for Not Applied category)
  const [advisingStudentModal, setAdvisingStudentModal] = React.useState<{
    student: ProfileRow;
    assignedAt: string;
  } | null>(null);

  // Handle Semester Change
  const handleSemesterChange = async (newSemId: string) => {
    setSelectedSemesterId(newSemId);
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdvisorQueueAction(newSemId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to update semester queue.");
      }
    } catch {
      setError("An unexpected error occurred while loading semester data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetchAdvisorQueueAction(selectedSemesterId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to refresh application queue.");
      }
    } catch {
      setError("An unexpected error occurred while refreshing.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered Lists based on Search & Batch filters
  const filteredPending = React.useMemo(() => {
    return data.pending.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.student.full_name.toLowerCase().includes(q) ||
        (item.student.diu_id && item.student.diu_id.toLowerCase().includes(q)) ||
        (item.student.batch && item.student.batch.toLowerCase().includes(q));

      const matchesBatch =
        batchFilter === "ALL" ||
        (item.student.batch && item.student.batch.includes(batchFilter)) ||
        (item.student.diu_id && item.student.diu_id.startsWith(batchFilter));

      let matchesSubStatus = true;
      if (pendingSubStatus === "PENDING_REVIEW") {
        matchesSubStatus = !item.isUnderReview;
      } else if (pendingSubStatus === "UNDER_REVIEW") {
        matchesSubStatus = item.isUnderReview;
      }

      return matchesSearch && matchesBatch && matchesSubStatus;
    });
  }, [data.pending, searchQuery, batchFilter, pendingSubStatus]);

  const filteredApproved = React.useMemo(() => {
    return data.approved.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.student.full_name.toLowerCase().includes(q) ||
        (item.student.diu_id && item.student.diu_id.toLowerCase().includes(q)) ||
        (item.student.batch && item.student.batch.toLowerCase().includes(q));

      const matchesBatch =
        batchFilter === "ALL" ||
        (item.student.batch && item.student.batch.includes(batchFilter)) ||
        (item.student.diu_id && item.student.diu_id.startsWith(batchFilter));

      return matchesSearch && matchesBatch;
    });
  }, [data.approved, searchQuery, batchFilter]);

  const filteredNotApplied = React.useMemo(() => {
    return data.notApplied.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.student.full_name.toLowerCase().includes(q) ||
        (item.student.diu_id && item.student.diu_id.toLowerCase().includes(q)) ||
        (item.student.batch && item.student.batch.toLowerCase().includes(q));

      const matchesBatch =
        batchFilter === "ALL" ||
        (item.student.batch && item.student.batch.includes(batchFilter)) ||
        (item.student.diu_id && item.student.diu_id.startsWith(batchFilter));

      return matchesSearch && matchesBatch;
    });
  }, [data.notApplied, searchQuery, batchFilter]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1c263c] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileCheck2 className="h-6 w-6 text-[#008764]" />
            <span>Application Center</span>
          </h1>
          <p className="text-xs text-[#8e9db2] mt-1">
            Faculty Advisor: <strong className="text-white">{data.advisor.full_name}</strong> • Department of Computer Science & Engineering
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Semester Selector */}
          <div className="flex items-center gap-1.5 bg-[#121827] border border-[#1c263c] rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-[#008764] shrink-0" />
            <span className="text-[#8e9db2] hidden sm:inline">Term:</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => handleSemesterChange(e.target.value)}
              disabled={isLoading}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              {data.semesters.map((sem) => (
                <option key={sem.id} value={sem.id} className="bg-[#121827] text-white">
                  {sem.season.charAt(0).toUpperCase() + sem.season.slice(1)} {sem.year}
                  {sem.is_active ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-8 border-[#1c263c] bg-[#121827] text-slate-300 hover:text-white hover:bg-[#172136] text-xs gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#008764]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. THREE CLEAR CATEGORIES (Segmented Navigation)                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 rounded-xl bg-[#121827] border border-[#1c263c]">
        {/* Tab A: Pending */}
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "pending"
              ? "bg-[#172136] text-white border border-[#25324d] shadow-xs"
              : "text-[#8e9db2] hover:text-white hover:bg-[#151c2d]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${activeTab === "pending" ? "text-amber-400" : "text-slate-400"}`} />
            <span>Pending</span>
          </div>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === "pending"
                ? "bg-amber-950/80 border border-amber-800 text-amber-300 font-bold"
                : "bg-[#0b0f19] text-[#8e9db2]"
            }`}
          >
            {data.counts.pending}
          </span>
        </button>

        {/* Tab B: Approved */}
        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "approved"
              ? "bg-[#172136] text-white border border-[#25324d] shadow-xs"
              : "text-[#8e9db2] hover:text-white hover:bg-[#151c2d]"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${activeTab === "approved" ? "text-emerald-400" : "text-slate-400"}`} />
            <span>Approved</span>
          </div>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === "approved"
                ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold"
                : "bg-[#0b0f19] text-[#8e9db2]"
            }`}
          >
            {data.counts.approved}
          </span>
        </button>

        {/* Tab C: Not Applied */}
        <button
          type="button"
          onClick={() => setActiveTab("not_applied")}
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "not_applied"
              ? "bg-[#172136] text-white border border-[#25324d] shadow-xs"
              : "text-[#8e9db2] hover:text-white hover:bg-[#151c2d]"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${activeTab === "not_applied" ? "text-slate-300" : "text-slate-400"}`} />
            <span>Not Applied</span>
          </div>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === "not_applied"
                ? "bg-slate-800 border border-slate-700 text-slate-200 font-bold"
                : "bg-[#0b0f19] text-[#8e9db2]"
            }`}
          >
            {data.counts.notApplied}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & CONTEXTUAL FILTERS                                            */}
      {/* ========================================================================= */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-6 lg:col-span-7">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={`Search ${
                activeTab === "pending"
                  ? "Pending applications"
                  : activeTab === "approved"
                  ? "Approved applications"
                  : "Unapplied scholars"
              } by student name or DIU ID...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0b0f19] border-[#1c263c] text-xs h-9 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          {/* Academic Batch Filter */}
          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full bg-[#0b0f19] border border-[#1c263c] text-xs h-9 text-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Batches</option>
              <option value="60">Batch 60 (2022 Entry)</option>
              <option value="61">Batch 61 (2023 Entry)</option>
              <option value="59">Batch 59 (2021 Entry)</option>
            </select>
          </div>

          {/* Sub-status filter for Pending */}
          {activeTab === "pending" ? (
            <div className="sm:col-span-3 lg:col-span-2">
              <select
                value={pendingSubStatus}
                onChange={(e) => setPendingSubStatus(e.target.value as "ALL" | "PENDING_REVIEW" | "UNDER_REVIEW")}
                className="w-full bg-[#0b0f19] border border-[#1c263c] text-xs h-9 text-slate-200 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Pending States</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
              </select>
            </div>
          ) : (
            <div className="sm:col-span-3 lg:col-span-2 flex items-center justify-end">
              <span className="text-xs font-mono text-[#8e9db2]">
                Term: <strong className="text-white">{data.selectedSemester.season.toUpperCase()} {data.selectedSemester.year}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CATEGORY CONTENT VIEWS                                                 */}
      {/* ========================================================================= */}

      {isLoading ? (
        <div className="py-20 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-3">
          <RotateCw className="h-6 w-6 animate-spin text-[#008764] mx-auto" />
          <div className="text-xs font-mono text-[#8e9db2]">Loading Application Center data...</div>
        </div>
      ) : (
        <>
          {/* CATEGORY A: PENDING APPLICATIONS */}
          {activeTab === "pending" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8e9db2] px-1 font-mono">
                <span>
                  Showing <strong className="text-white">{filteredPending.length}</strong> of {data.counts.pending} pending applications
                </span>
                <span>Actions: Review / Continue Review</span>
              </div>

              {filteredPending.length === 0 ? (
                <div className="py-16 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-2 p-6">
                  <Clock className="h-8 w-8 text-amber-400 mx-auto opacity-70" />
                  <h3 className="text-sm font-semibold text-white">
                    {searchQuery ? "No matching pending applications" : `No pending applications for ${data.selectedSemester.season} ${data.selectedSemester.year}`}
                  </h3>
                  <p className="text-xs text-[#8e9db2] max-w-md mx-auto">
                    {searchQuery
                      ? `No pending applications matched your filter "${searchQuery}". Clear your search to view all pending applications.`
                      : "All submitted registration slips for this semester have been audited and finalized."}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                      Clear Search Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121827] border-b border-[#1c263c] font-mono text-[11px] text-[#8e9db2]">
                        <tr>
                          <th className="py-3 px-4 font-medium">Student Scholar</th>
                          <th className="py-3 px-3 font-medium">Batch & Dept</th>
                          <th className="py-3 px-3 font-medium text-center">CGPA & Cr</th>
                          <th className="py-3 px-3 font-medium text-center">Cohort (Prev &rarr; Desired)</th>
                          <th className="py-3 px-3 font-medium text-center">Course Load</th>
                          <th className="py-3 px-3 font-medium text-center">Status</th>
                          <th className="py-3 px-3 font-medium">Submitted</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c263c]">
                        {filteredPending.map((item) => (
                          <tr key={item.registrationId} className="hover:bg-[#121827]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{item.student.full_name}</div>
                              <div className="font-mono text-emerald-400 text-[11px]">{item.student.diu_id || "N/A"}</div>
                              <div className="text-[#8e9db2] text-[10px] truncate max-w-[200px]">{item.student.email}</div>
                              {(item.student as unknown as { authorized_alternative_email?: string }).authorized_alternative_email && (
                                <div className="text-emerald-400/80 text-[10px] font-mono mt-0.5">
                                  Alt: {(item.student as unknown as { authorized_alternative_email?: string }).authorized_alternative_email}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-200">{item.student.batch || "60th Batch"}</div>
                              <div className="text-[11px] font-mono text-slate-400">{item.student.department_code || "CSE"}</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <div className="font-bold text-white">{item.student.cgpa?.toFixed(2) || "3.50"}</div>
                              <div className="text-[11px] text-[#8e9db2]">{item.student.completed_credits || 0} Cr</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <span className="text-slate-300 px-1.5 py-0.5 rounded bg-[#121827] border border-[#1c263c]">
                                {item.previousSection}
                              </span>
                              <span className="text-slate-500 mx-1">&rarr;</span>
                              <span className="text-emerald-400 px-1.5 py-0.5 rounded bg-[#121827] border border-[#1c263c] font-bold">
                                {item.desiredSection}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <div className="font-bold text-white">{item.totalCourses} Courses</div>
                              <div className="text-[11px] text-emerald-400">{item.totalCredits.toFixed(1)} Cr</div>
                              <div className="text-[10px] text-[#8e9db2]">
                                {item.generalCourseCount} Gen • {item.retakeCourseCount} Ret
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {item.isUnderReview ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-blue-950/80 border border-blue-800 text-blue-300">
                                  <Clock className="h-3 w-3" />
                                  Under Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-950/80 border border-amber-800 text-amber-300">
                                  <Clock className="h-3 w-3" />
                                  Pending Review
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px] text-[#8e9db2]">
                              {item.formattedDate}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                asChild
                                size="sm"
                                className="h-8 px-3 bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold rounded-lg shadow-xs"
                              >
                                <Link href={`/advisor/review/${item.registrationId}`}>
                                  <span>{item.isUnderReview ? "Continue Review" : "Review"}</span>
                                  <ArrowRight className="h-3.5 w-3.5 ml-1 text-white" />
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY B: APPROVED APPLICATIONS */}
          {activeTab === "approved" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8e9db2] px-1 font-mono">
                <span>
                  Showing <strong className="text-white">{filteredApproved.length}</strong> of {data.counts.approved} approved applications
                </span>
                <span>Action: View Details</span>
              </div>

              {filteredApproved.length === 0 ? (
                <div className="py-16 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-2 p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-70" />
                  <h3 className="text-sm font-semibold text-white">
                    {searchQuery ? "No matching approved applications" : `No approved applications found for ${data.selectedSemester.season} ${data.selectedSemester.year}`}
                  </h3>
                  <p className="text-xs text-[#8e9db2] max-w-md mx-auto">
                    {searchQuery
                      ? `No approved applications matched "${searchQuery}". Clear search to view all finalized records.`
                      : "Once you audit and approve advisee course registration applications, they will be listed here with final details."}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                      Clear Search Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121827] border-b border-[#1c263c] font-mono text-[11px] text-[#8e9db2]">
                        <tr>
                          <th className="py-3 px-4 font-medium">Student Scholar</th>
                          <th className="py-3 px-3 font-medium">Batch & Dept</th>
                          <th className="py-3 px-3 font-medium text-center">CGPA & Cr</th>
                          <th className="py-3 px-3 font-medium text-center">Enrolled Cohort</th>
                          <th className="py-3 px-3 font-medium text-center">Course Load</th>
                          <th className="py-3 px-3 font-medium text-center">Status</th>
                          <th className="py-3 px-3 font-medium">Approved Date</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c263c]">
                        {filteredApproved.map((item) => (
                          <tr key={item.registrationId} className="hover:bg-[#121827]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{item.student.full_name}</div>
                              <div className="font-mono text-emerald-400 text-[11px]">{item.student.diu_id || "N/A"}</div>
                              <div className="text-[#8e9db2] text-[10px] truncate max-w-[200px]">{item.student.email}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-200">{item.student.batch || "60th Batch"}</div>
                              <div className="text-[11px] font-mono text-slate-400">{item.student.department_code || "CSE"}</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <div className="font-bold text-white">{item.student.cgpa?.toFixed(2) || "3.50"}</div>
                              <div className="text-[11px] text-[#8e9db2]">{item.student.completed_credits || 0} Cr</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <span className="text-emerald-400 px-2 py-0.5 rounded bg-[#121827] border border-emerald-800/80 font-bold">
                                {item.desiredSection}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <div className="font-bold text-white">{item.totalCourses} Courses</div>
                              <div className="text-[11px] text-emerald-400">{item.totalCredits.toFixed(1)} Cr</div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Approved
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px] text-[#8e9db2]">
                              {item.formattedDate}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 border-[#1c263c] bg-[#121827] hover:bg-[#172136] text-slate-200 hover:text-white text-xs font-medium rounded-lg"
                              >
                                <Link href={`/advisor/review/${item.registrationId}`}>
                                  <Eye className="h-3.5 w-3.5 mr-1 text-[#008764]" />
                                  <span>View Details</span>
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY C: NOT APPLIED SCHOLARS */}
          {activeTab === "not_applied" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8e9db2] px-1 font-mono">
                <span>
                  Showing <strong className="text-white">{filteredNotApplied.length}</strong> of {data.counts.notApplied} assigned scholars with no application
                </span>
                <span>Action: View Advising Details</span>
              </div>

              {filteredNotApplied.length === 0 ? (
                <div className="py-16 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-2 p-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-70" />
                  <h3 className="text-sm font-semibold text-white">
                    {searchQuery ? "No matching unapplied scholars" : `All assigned scholars have applied for ${data.selectedSemester.season} ${data.selectedSemester.year}`}
                  </h3>
                  <p className="text-xs text-[#8e9db2] max-w-md mx-auto">
                    {searchQuery
                      ? `No unapplied scholars matched "${searchQuery}". Clear your search filter.`
                      : "100% of your assigned advisees have submitted course registration applications for this semester."}
                  </p>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                      Clear Search Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121827] border-b border-[#1c263c] font-mono text-[11px] text-[#8e9db2]">
                        <tr>
                          <th className="py-3 px-4 font-medium">Student Scholar</th>
                          <th className="py-3 px-3 font-medium">Batch & Dept</th>
                          <th className="py-3 px-3 font-medium text-center">CGPA & Cr</th>
                          <th className="py-3 px-3 font-medium">Assigned Date</th>
                          <th className="py-3 px-3 font-medium text-center">Status</th>
                          <th className="py-3 px-3 font-medium">Direct Contact</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c263c]">
                        {filteredNotApplied.map((item) => (
                          <tr key={item.assignmentId} className="hover:bg-[#121827]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{item.student.full_name}</div>
                              <div className="font-mono text-emerald-400 text-[11px]">{item.student.diu_id || "N/A"}</div>
                              <div className="text-[#8e9db2] text-[10px] truncate max-w-[200px]">{item.student.email}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-200">{item.student.batch || "60th Batch"}</div>
                              <div className="text-[11px] font-mono text-slate-400">{item.student.department_code || "CSE"}</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              <div className="font-bold text-white">{item.student.cgpa?.toFixed(2) || "3.50"}</div>
                              <div className="text-[11px] text-[#8e9db2]">{item.student.completed_credits || 0} Cr</div>
                            </td>

                            <td className="py-3 px-3 font-mono text-[11px] text-[#8e9db2]">
                              {item.formattedAssignedDate}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-800/80 border border-slate-700 text-slate-300">
                                <AlertCircle className="h-3 w-3 text-amber-400" />
                                Not Applied
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`mailto:${item.student.email}`}
                                  className="p-1 rounded bg-[#121827] border border-[#1c263c] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                                  title={`Email ${item.student.full_name}`}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                </a>
                                {item.student.phone && (
                                  <a
                                    href={`tel:${item.student.phone}`}
                                    className="p-1 rounded bg-[#121827] border border-[#1c263c] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                                    title={`Call ${item.student.phone}`}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAdvisingStudentModal({ student: item.student, assignedAt: item.formattedAssignedDate })}
                                className="h-8 px-3 border-[#1c263c] bg-[#121827] hover:bg-[#172136] text-slate-200 hover:text-white text-xs font-medium rounded-lg"
                              >
                                <User className="h-3.5 w-3.5 mr-1 text-[#008764]" />
                                <span>View Advising Details</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. ADVISING DETAILS MODAL (FOR NOT APPLIED STUDENTS)                       */}
      {/* ========================================================================= */}
      {advisingStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#1c263c] pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-medium">
                  <AlertCircle className="h-3 w-3 text-amber-400" />
                  <span>Advisee Registration Status: Not Applied</span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Advisee Academic Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdvisingStudentModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Student Details Grid */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-2 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">Full Name:</span>
                  <strong className="text-white text-sm">{advisingStudentModal.student.full_name}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">DIU Student ID:</span>
                  <strong className="font-mono text-emerald-400">{advisingStudentModal.student.diu_id || "N/A"}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">Academic Batch:</span>
                  <span className="text-slate-300">{advisingStudentModal.student.batch || "60th Batch"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">Department:</span>
                  <span className="text-slate-300">{advisingStudentModal.student.department_code || "CSE"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">Academic Standing:</span>
                  <span className="font-mono text-white">
                    CGPA <strong>{advisingStudentModal.student.cgpa?.toFixed(2) || "3.50"}</strong> • {advisingStudentModal.student.completed_credits || 0} Credits Passed
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8e9db2]">Institutional Email:</span>
                  <span className="font-mono text-slate-300">{advisingStudentModal.student.email}</span>
                </div>
                {advisingStudentModal.student.phone && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#8e9db2]">Contact Phone:</span>
                    <span className="font-mono text-slate-300">{advisingStudentModal.student.phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-[#1c263c]">
                  <span className="text-[#8e9db2]">Advisor Assignment Date:</span>
                  <span className="font-mono text-slate-400">{advisingStudentModal.assignedAt}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/80 text-amber-200 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Advising Guidance Directive</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  This scholar is assigned to your advising group for <strong>{data.selectedSemester.season.toUpperCase()} {data.selectedSemester.year}</strong>, but has not yet submitted a course registration application.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1c263c]">
              <a
                href={`mailto:${advisingStudentModal.student.email}?subject=DIU%20Course%20Registration%20Reminder%20-%20${data.selectedSemester.season}%20${data.selectedSemester.year}&body=Dear%20${encodeURIComponent(advisingStudentModal.student.full_name)},%0A%0APlease%20be%20reminded%20to%20complete%20and%20submit%20your%20course%20registration%20application%20for%20the%20active%20${data.selectedSemester.season}%20${data.selectedSemester.year}%20semester.%0A%0ARegards,%0A${encodeURIComponent(data.advisor.full_name)}%0AFaculty%20Advisor,%20DIU`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Email Reminder</span>
              </a>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdvisingStudentModal(null)}
                className="text-xs border-[#1c263c] bg-[#121827] text-slate-300 hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
