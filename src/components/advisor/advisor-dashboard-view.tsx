"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_ADVISOR_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
} from "@/lib/mock/data";
import {
  Users,
  Clock,
  Check,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCw,
} from "lucide-react";

export function AdvisorDashboardView() {
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [batchFilter, setBatchFilter] = React.useState("ALL");
  const [paymentFilter, setPaymentFilter] = React.useState("ALL");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const rawQueue = MOCK_ADVISEE_QUEUE;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Filter applications based on controls
  const filteredQueue = React.useMemo(() => {
    return rawQueue.filter((app) => {
      const q = searchInput.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        app.student.full_name.toLowerCase().includes(q) ||
        (app.student.diu_id && app.student.diu_id.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === "PENDING") {
        matchesStatus = app.registration.status === "pending_advisor" && !app.isUnderReview;
      } else if (statusFilter === "UNDER_REVIEW") {
        matchesStatus = Boolean(app.isUnderReview);
      } else if (statusFilter === "COMPLETED") {
        matchesStatus = app.registration.status === "approved";
      }

      let matchesBatch = true;
      if (batchFilter !== "ALL") {
        matchesBatch = app.student.batch === batchFilter;
      }

      let matchesPayment = true;
      if (paymentFilter === "PAID") {
        matchesPayment = app.registration.payment_cleared;
      } else if (paymentFilter === "UNPAID") {
        matchesPayment = !app.registration.payment_cleared;
      }

      return matchesSearch && matchesStatus && matchesBatch && matchesPayment;
    });
  }, [rawQueue, searchInput, statusFilter, batchFilter, paymentFilter]);

  // Helper for initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Greeting Header (Exact match to Mockup 2) */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome, {MOCK_ADVISOR_PROFILE.full_name}
        </h1>
        <p className="text-sm text-[#8e9db2]">
          Here&apos;s what&apos;s happening with your assigned students.
        </p>
      </div>

      {/* 4 Stat Cards in a Row (Exact match to Mockup 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Students */}
        <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">245</div>
            <div className="text-xs text-[#8e9db2] mt-0.5">Assigned Students</div>
          </div>
        </div>

        {/* Card 2: Pending Applications */}
        <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-slate-300" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">12</div>
            <div className="text-xs text-[#8e9db2] mt-0.5">Pending Applications</div>
          </div>
        </div>

        {/* Card 3: Under Review (with emerald accent border) */}
        <div className="bg-[#121827] border border-[#1c263c] border-l-4 border-l-emerald-500 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">8</div>
            <div className="text-xs text-[#8e9db2] mt-0.5">Under Review</div>
          </div>
        </div>

        {/* Card 4: Completed (with purple accent border) */}
        <div className="bg-[#121827] border border-[#1c263c] border-l-4 border-l-purple-500 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">210</div>
            <div className="text-xs text-[#8e9db2] mt-0.5">Completed</div>
          </div>
        </div>
      </div>

      {/* Main Table Card: Student Applications (Exact match to Mockup 2) */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Card Header: Title + Subtitle + Semester Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1a233a] border border-[#25324d] flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Student Applications
              </h2>
              <p className="text-xs text-[#8e9db2]">
                Review and finalize student course selections
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <select
              defaultValue={ACTIVE_MOCK_SEMESTER_LABEL}
              className="bg-[#0b0f19] border border-[#1e293b] text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={ACTIVE_MOCK_SEMESTER_LABEL}>{ACTIVE_MOCK_SEMESTER_LABEL}</option>
              <option value="Fall 2026">Fall 2026</option>
              <option value="Summer 2026">Summer 2026</option>
            </select>
          </div>
        </div>

        {/* Filter Ribbon: Search + Status Dropdown + Batch Dropdown + Payment Dropdown + Blue Refresh */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-normal transition-colors"
            />
          </div>

          {/* Filter Dropdowns + Blue Refresh */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0b0f19] border border-[#1e293b] text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-[#0b0f19] border border-[#1e293b] text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              <option value="61">Batch 61</option>
              <option value="60">Batch 60</option>
              <option value="59">Batch 59</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#0b0f19] border border-[#1e293b] text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Payment</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>

            {/* Blue Refresh Button (Matches Mockup 2: #2563eb) */}
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Data Table (Exact match to Mockup 2 columns and rows) */}
        <div className="overflow-x-auto rounded-xl border border-[#1c263c]/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1c263c] bg-[#0d1320]/60 text-[#8e9db2] text-[11px] font-semibold tracking-wider uppercase">
                <th scope="col" className="py-3 px-4">Student</th>
                <th scope="col" className="py-3 px-4">ID</th>
                <th scope="col" className="py-3 px-4">Batch</th>
                <th scope="col" className="py-3 px-4">Payment</th>
                <th scope="col" className="py-3 px-4">Application Date</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]/60">
              {filteredQueue.map((app) => {
                const initials = getInitials(app.student.full_name);
                const isPaid = app.registration.payment_cleared;
                const isUnderReview = Boolean(app.isUnderReview);
                const isApproved = app.registration.status === "approved";

                return (
                  <tr
                    key={app.registration.id}
                    className="hover:bg-[#162035]/50 transition-colors"
                  >
                    {/* Student Column with Avatar */}
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-[#334155] text-slate-200 font-semibold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="font-medium text-white">{app.student.full_name}</span>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {app.student.diu_id}
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {app.student.batch || "61"}
                    </td>

                    {/* Payment Status Badge */}
                    <td className="py-3.5 px-4">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#062822] border border-[#064e3b] text-[#10b981] text-[11px] font-medium">
                          <Check className="h-3 w-3" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2e1014] border border-[#881337] text-[#ef4444] text-[11px] font-medium">
                          <AlertCircle className="h-3 w-3" />
                          <span>Unpaid</span>
                        </span>
                      )}
                    </td>

                    {/* Application Date */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {app.formattedApplicationDate || "Apr 14, 2027 • 2:30 PM"}
                    </td>

                    {/* Application Status Badge */}
                    <td className="py-3.5 px-4">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#062822] border border-[#064e3b] text-[#10b981] text-[11px] font-medium">
                          <Check className="h-3 w-3" />
                          <span>Completed</span>
                        </span>
                      ) : isUnderReview ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0c223d] border border-[#0369a1] text-[#38bdf8] text-[11px] font-medium">
                          <RotateCw className="h-3 w-3" />
                          <span>Under Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2b200b] border border-[#78350f] text-[#f59e0b] text-[11px] font-medium">
                          <Clock className="h-3 w-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Button */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/advisor/review/${app.registration.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1e293b] bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-medium transition-colors shadow-xs"
                      >
                        <span>{isApproved ? "View" : "Review"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#8e9db2]">
                    No student applications match the specified criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Results Count + Pagination (Exact match to Mockup 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-[#8e9db2]">
            Showing 1-{filteredQueue.length} of {filteredQueue.length} results
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* Previous Page */}
            <button
              disabled
              className="w-8 h-8 rounded-lg border border-[#1e293b] bg-[#0f172a] text-slate-500 flex items-center justify-center disabled:opacity-40 cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page 1 (Active) */}
            <button
              className="w-8 h-8 rounded-lg bg-[#2563eb] text-white font-semibold text-xs flex items-center justify-center shadow-xs"
              aria-label="Page 1"
            >
              1
            </button>

            {/* Next Page */}
            <button
              disabled
              className="w-8 h-8 rounded-lg border border-[#1e293b] bg-[#0f172a] text-slate-500 flex items-center justify-center disabled:opacity-40 cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
