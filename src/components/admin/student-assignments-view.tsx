"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Search,
  UserCheck,
  Users,
  Hash,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle2,
  X,
  DatabaseZap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignIndividualStudentAction,
  bulkAssignStudentsAction,
  getStudentAssignmentHistoryAction,
  previewRangeMatchAction,
  type StudentAssignmentHistoryItem,
  type StudentAssignmentOverviewRow,
} from "@/app/admin/assignments/actions";
import type {
  AdvisorProfileRow,
  DepartmentRow,
  SemesterRow,
} from "@/lib/admin/admin-service";

interface StudentAssignmentsViewProps {
  available: boolean;
  errorMessage?: string;
  semesters: SemesterRow[];
  selectedSemesterId: string;
  departments: DepartmentRow[];
  advisors: AdvisorProfileRow[];
  rows: StudentAssignmentOverviewRow[];
  initialFilter?: string;
  initialBatch?: string;
}

type AssignmentTab = "overview" | "batch" | "range" | "reassign";

export function StudentAssignmentsView({
  available,
  errorMessage,
  semesters,
  selectedSemesterId,
  departments,
  advisors,
  rows,
  initialFilter,
  initialBatch,
}: StudentAssignmentsViewProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<AssignmentTab>("overview");
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [batchFilter, setBatchFilter] = React.useState(initialBatch || "all");
  const [advisorFilter, setAdvisorFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<string>(initialFilter || "all");

  // Individual modal
  const [selectedStudent, setSelectedStudent] = React.useState<StudentAssignmentOverviewRow | null>(null);
  const [historyItems, setHistoryItems] = React.useState<StudentAssignmentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [indAdvisorId, setIndAdvisorId] = React.useState("");
  const [indReason, setIndReason] = React.useState("");
  const [indSaving, setIndSaving] = React.useState(false);
  const [indError, setIndError] = React.useState<string | null>(null);

  // Batch-wide state
  const [batchTabBatch, setBatchTabBatch] = React.useState("");
  const [batchTabAdvisorId, setBatchTabAdvisorId] = React.useState("");
  const [batchTabSelectedIds, setBatchTabSelectedIds] = React.useState<string[]>([]);
  const [batchTabReason, setBatchTabReason] = React.useState("Batch-wide advisor assignment");
  const [batchTabBusy, setBatchTabBusy] = React.useState(false);
  const [batchTabMsg, setBatchTabMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Range state
  const [rangeInput, setRangeInput] = React.useState("");
  const [rangeAdvisorId, setRangeAdvisorId] = React.useState("");
  const [rangeReason, setRangeReason] = React.useState("Student ID range assignment");
  const [rangeMatched, setRangeMatched] = React.useState<
    { id: string; diuId: string | null; fullName: string; batch: string | null; hasIndividualAssignment: boolean }[]
  >([]);
  const [rangeBusy, setRangeBusy] = React.useState(false);
  const [rangeMsg, setRangeMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Bulk reassign state
  const [outgoingAdvisorId, setOutgoingAdvisorId] = React.useState("");
  const [incomingAdvisorId, setIncomingAdvisorId] = React.useState("");
  const [reassignBatch, setReassignBatch] = React.useState("all");
  const [reassignReason, setReassignReason] = React.useState("Advisor reassignment");
  const [reassignBusy, setReassignBusy] = React.useState(false);
  const [reassignMsg, setReassignMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  const uniqueBatches = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.batch) set.add(r.batch);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (deptFilter !== "all" && (r.departmentCode || "") !== deptFilter) return false;
      if (batchFilter !== "all" && (r.batch || "") !== batchFilter) return false;
      if (advisorFilter !== "all" && (r.advisorProfileId || "") !== advisorFilter) return false;
      if (statusFilter === "assigned" && r.assignmentStatus !== "assigned") return false;
      if (statusFilter === "unassigned" && r.assignmentStatus !== "unassigned") return false;
      if (statusFilter === "conflicts" && r.assignmentStatus !== "conflict") return false;
      if (!q) return true;
      return (
        (r.diuId || "").toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q) ||
        (r.advisorName || "").toLowerCase().includes(q) ||
        (r.advisorEmail || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, deptFilter, batchFilter, advisorFilter, statusFilter]);

  const openStudentDetail = async (row: StudentAssignmentOverviewRow) => {
    setSelectedStudent(row);
    setIndAdvisorId(row.advisorProfileId || advisors[0]?.id || "");
    setIndReason("");
    setIndError(null);
    setHistoryLoading(true);
    const res = await getStudentAssignmentHistoryAction(row.studentId, selectedSemesterId);
    setHistoryLoading(false);
    setHistoryItems(res.success && res.data ? res.data : []);
  };

  const handleIndividualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIndError(null);
    setIndSaving(true);
    const res = await assignIndividualStudentAction({
      studentId: selectedStudent.studentId,
      advisorProfileId: indAdvisorId,
      semesterId: selectedSemesterId,
      reason: indReason,
    });
    setIndSaving(false);
    if (!res.success) {
      setIndError(res.error || "Failed to update assignment.");
      return;
    }
    setSelectedStudent(null);
    router.refresh();
  };

  const batchStudents = React.useMemo(() => {
    if (!batchTabBatch) return [];
    return rows.filter((r) => r.batch === batchTabBatch);
  }, [rows, batchTabBatch]);

  const handleBatchTabChange = (nextBatch: string) => {
    setBatchTabBatch(nextBatch);
    setBatchTabSelectedIds(
      nextBatch ? rows.filter((r) => r.batch === nextBatch).map((s) => s.studentId) : []
    );
  };

  const handleBatchAssign = async () => {
    setBatchTabMsg(null);
    setBatchTabBusy(true);
    const res = await bulkAssignStudentsAction({
      studentIds: batchTabSelectedIds,
      advisorProfileId: batchTabAdvisorId,
      semesterId: selectedSemesterId,
      ruleType: "batch",
      source: "batch_rule",
      reason: batchTabReason,
    });
    setBatchTabBusy(false);
    if (!res.success || !res.data) {
      setBatchTabMsg({ type: "err", text: res.error || "Batch assignment failed." });
      return;
    }
    setBatchTabMsg({
      type: "ok",
      text: `Assigned ${res.data.assignedCount} student(s). Skipped ${res.data.skippedIndividualCount} with existing individual assignments.`,
    });
    router.refresh();
  };

  const handlePreviewRange = async () => {
    setRangeMsg(null);
    setRangeBusy(true);
    const res = await previewRangeMatchAction({
      rangeExpression: rangeInput,
      semesterId: selectedSemesterId,
    });
    setRangeBusy(false);
    if (!res.success || !res.data) {
      setRangeMatched([]);
      setRangeMsg({ type: "err", text: res.error || "Invalid student ID range." });
      return;
    }
    setRangeMatched(res.data.matchedStudents);
    if (res.data.matchedStudents.length === 0) {
      setRangeMsg({ type: "err", text: "No existing student profiles matched that range." });
    }
  };

  const handleCommitRange = async () => {
    setRangeMsg(null);
    setRangeBusy(true);
    const res = await bulkAssignStudentsAction({
      studentIds: rangeMatched.map((m) => m.id),
      advisorProfileId: rangeAdvisorId,
      semesterId: selectedSemesterId,
      ruleType: "range",
      source: "range_rule",
      sourceRangeRaw: rangeInput,
      reason: rangeReason,
    });
    setRangeBusy(false);
    if (!res.success || !res.data) {
      setRangeMsg({ type: "err", text: res.error || "Range assignment failed." });
      return;
    }
    setRangeMsg({
      type: "ok",
      text: `Assigned ${res.data.assignedCount} student(s). Skipped ${res.data.skippedIndividualCount} with individual assignments.`,
    });
    router.refresh();
  };

  const outgoingStudents = React.useMemo(() => {
    if (!outgoingAdvisorId) return [];
    return rows.filter(
      (r) =>
        r.advisorProfileId === outgoingAdvisorId &&
        (reassignBatch === "all" || r.batch === reassignBatch)
    );
  }, [rows, outgoingAdvisorId, reassignBatch]);

  const handleBulkReassign = async () => {
    setReassignMsg(null);
    setReassignBusy(true);
    const res = await bulkAssignStudentsAction({
      studentIds: outgoingStudents.map((s) => s.studentId),
      advisorProfileId: incomingAdvisorId,
      semesterId: selectedSemesterId,
      ruleType: "individual",
      source: "reassignment",
      reason: reassignReason,
      overrideExistingIndividual: true,
    });
    setReassignBusy(false);
    if (!res.success || !res.data) {
      setReassignMsg({ type: "err", text: res.error || "Bulk reassignment failed." });
      return;
    }
    setReassignMsg({
      type: "ok",
      text: `Reassigned ${res.data.assignedCount} student(s) to the incoming advisor.`,
    });
    router.refresh();
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header & Semester Switcher */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <GitBranch className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Student Advisor Assignments
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Manage individual, batch-wide, range-based, and outgoing-to-incoming advisor reassignments with full audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="asg-sem" className="text-xs text-[#8e9db2]">
            Semester
          </label>
          <select
            id="asg-sem"
            value={selectedSemesterId}
            onChange={(e) => router.push(`/admin/assignments?semester=${encodeURIComponent(e.target.value)}`)}
            className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `${s.season} ${s.year}`} {s.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!available && (
        <div
          role="alert"
          className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-3 text-xs text-rose-200"
        >
          <DatabaseZap className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Assignments Data Unavailable</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "overview", label: "Assignment Overview", icon: UserCheck },
          { id: "batch", label: "Batch-Wide Assignment", icon: Users },
          { id: "range", label: "Student ID Range Editor", icon: Hash },
          { id: "reassign", label: "Bulk Advisor Reassignment", icon: ArrowLeftRight },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as AssignmentTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                active
                  ? "bg-[#172136] border-emerald-500/60 text-white"
                  : "bg-[#121827] border-[#1c263c] text-[#8e9db2] hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, student, advisor..."
                aria-label="Search student assignments"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1c263c] bg-[#0b0f19] text-xs text-white"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter by department"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              aria-label="Filter by batch"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Batches</option>
              {uniqueBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={advisorFilter}
              onChange={(e) => setAdvisorFilter(e.target.value)}
              aria-label="Filter by advisor"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Advisors</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by assignment status"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="conflicts">Conflicts</option>
            </select>
          </div>

          <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0f1523] border-b border-[#1c263c]">
                  <tr>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Student</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Batch</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Current Advisor</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Source / Rule</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c263c]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[#8e9db2]">
                        No student records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.studentId} className="hover:bg-[#172136]/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{r.studentName}</div>
                          <div className="font-mono text-emerald-400">{r.diuId || "No DIU ID"}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {r.batch || "—"} {r.departmentCode ? `(${r.departmentCode})` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {r.advisorName ? (
                            <div>
                              <div className="font-medium text-white">{r.advisorName}</div>
                              <div className="font-mono text-slate-400">{r.advisorEmail}</div>
                            </div>
                          ) : (
                            <span className="text-amber-300">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {r.assignmentSource ? `${r.assignmentSource} (${r.assignmentRuleType})` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.assignmentStatus === "assigned" ? (
                            <span className="rounded border border-[#064e3b] bg-[#062822] px-2 py-0.5 text-[#10b981]">
                              Assigned
                            </span>
                          ) : r.assignmentStatus === "conflict" ? (
                            <span className="rounded border border-[#881337] bg-[#2e1014] px-2 py-0.5 text-rose-300">
                              Conflict
                            </span>
                          ) : (
                            <span className="rounded border border-[#78350f] bg-[#2b200b] px-2 py-0.5 text-amber-300">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button type="button" size="sm" variant="secondary" onClick={() => openStudentDetail(r)}>
                            Assign / History
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Batch-Wide Assignment */}
      {tab === "batch" && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <h2 className="text-base font-bold text-white">Batch-Wide Advisor Assignment</h2>
          <p className="text-[#8e9db2]">
            Existing individual student assignments are preserved by precedence rules and never silently overwritten.
          </p>

          {batchTabMsg && (
            <div
              className={`rounded-lg border p-3 flex items-center gap-2 ${
                batchTabMsg.type === "ok"
                  ? "border-[#064e3b] bg-[#062822] text-emerald-200"
                  : "border-[#881337] bg-[#2e1014] text-rose-200"
              }`}
            >
              {batchTabMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{batchTabMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="bw-batch" className="font-medium text-slate-200">
                Select Batch *
              </label>
              <select
                id="bw-batch"
                value={batchTabBatch}
                onChange={(e) => handleBatchTabChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
              >
                <option value="">-- Choose Batch --</option>
                {uniqueBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="bw-advisor" className="font-medium text-slate-200">
                Target Advisor *
              </label>
              <select
                id="bw-advisor"
                value={batchTabAdvisorId}
                onChange={(e) => setBatchTabAdvisorId(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
              >
                <option value="">-- Choose Advisor --</option>
                {advisors.filter((a) => a.is_active).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name} ({a.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="bw-reason" className="font-medium text-slate-200">
                Audit Reason *
              </label>
              <input
                id="bw-reason"
                value={batchTabReason}
                onChange={(e) => setBatchTabReason(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
              />
            </div>
          </div>

          {batchTabBatch && (
            <div className="rounded-lg border border-[#1c263c] bg-[#0b0f19] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  Students in {batchTabBatch}: {batchStudents.length} ({batchTabSelectedIds.length} selected)
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#1c263c]">
                {batchStudents.map((st) => (
                  <label key={st.studentId} className="flex items-center justify-between py-2 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={batchTabSelectedIds.includes(st.studentId)}
                        onChange={(e) => {
                          setBatchTabSelectedIds((prev) =>
                            e.target.checked
                              ? [...prev, st.studentId]
                              : prev.filter((id) => id !== st.studentId)
                          );
                        }}
                      />
                      <span className="font-mono text-emerald-400">{st.diuId || "No ID"}</span>
                      <span className="text-white">{st.studentName}</span>
                    </span>
                    <span className="text-slate-400">
                      {st.advisorName ? `${st.advisorName} (${st.assignmentRuleType})` : "Unassigned"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="institution"
            isLoading={batchTabBusy}
            disabled={!batchTabAdvisorId || batchTabSelectedIds.length === 0}
            onClick={handleBatchAssign}
          >
            Assign {batchTabSelectedIds.length} Selected Student(s)
          </Button>
        </div>
      )}

      {/* Tab 3: Student ID Range Assignment */}
      {tab === "range" && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <h2 className="text-base font-bold text-white">Student ID Range Assignment</h2>
          {rangeMsg && (
            <div
              className={`rounded-lg border p-3 flex items-center gap-2 ${
                rangeMsg.type === "ok"
                  ? "border-[#064e3b] bg-[#062822] text-emerald-200"
                  : "border-[#881337] bg-[#2e1014] text-rose-200"
              }`}
            >
              {rangeMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{rangeMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="rng-expr" className="font-medium text-slate-200">
                Student ID Range Expression *
              </label>
              <input
                id="rng-expr"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 262-15-001 to 262-15-066 & 262-15-099"
                className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="secondary" isLoading={rangeBusy} onClick={handlePreviewRange}>
                Preview Matched Students
              </Button>
            </div>
          </div>

          {rangeMatched.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#1c263c] bg-[#0b0f19] p-4 max-h-48 overflow-y-auto divide-y divide-[#1c263c]">
                {rangeMatched.map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between">
                    <span>
                      <span className="font-mono text-emerald-400 mr-2">{m.diuId}</span>
                      <span className="text-white">{m.fullName}</span>
                    </span>
                    <span className="text-slate-400">
                      {m.hasIndividualAssignment ? "Has Individual Assignment (Protected)" : m.batch || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={rangeAdvisorId}
                  onChange={(e) => setRangeAdvisorId(e.target.value)}
                  aria-label="Target advisor for range"
                  className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                >
                  <option value="">-- Choose Target Advisor --</option>
                  {advisors.filter((a) => a.is_active).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} ({a.email})
                    </option>
                  ))}
                </select>
                <input
                  value={rangeReason}
                  onChange={(e) => setRangeReason(e.target.value)}
                  placeholder="Audit reason..."
                  aria-label="Reason for range assignment"
                  className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                />
              </div>

              <Button
                type="button"
                variant="institution"
                isLoading={rangeBusy}
                disabled={!rangeAdvisorId}
                onClick={handleCommitRange}
              >
                Confirm Range Assignment ({rangeMatched.length} Matched)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Bulk Advisor Reassignment */}
      {tab === "reassign" && (
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-6 space-y-5 text-xs">
          <h2 className="text-base font-bold text-white">Bulk Outgoing &rarr; Incoming Advisor Reassignment</h2>
          <p className="text-[#8e9db2]">
            Reassigns students only within the selected semester; unrelated historical semesters remain untouched.
          </p>

          {reassignMsg && (
            <div
              className={`rounded-lg border p-3 flex items-center gap-2 ${
                reassignMsg.type === "ok"
                  ? "border-[#064e3b] bg-[#062822] text-emerald-200"
                  : "border-[#881337] bg-[#2e1014] text-rose-200"
              }`}
            >
              {reassignMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{reassignMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={outgoingAdvisorId}
              onChange={(e) => setOutgoingAdvisorId(e.target.value)}
              aria-label="Outgoing advisor"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              <option value="">-- Outgoing Advisor --</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
            <select
              value={incomingAdvisorId}
              onChange={(e) => setIncomingAdvisorId(e.target.value)}
              aria-label="Incoming advisor"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              <option value="">-- Incoming Advisor --</option>
              {advisors.filter((a) => a.is_active && a.id !== outgoingAdvisorId).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
            <select
              value={reassignBatch}
              onChange={(e) => setReassignBatch(e.target.value)}
              aria-label="Scope by batch"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            >
              <option value="all">All Batches of Outgoing Advisor</option>
              {uniqueBatches.map((b) => (
                <option key={b} value={b}>
                  {b} Only
                </option>
              ))}
            </select>
            <input
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="Reassignment reason..."
              aria-label="Reason for bulk reassignment"
              className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
            />
          </div>

          <div className="rounded-lg border border-[#1c263c] bg-[#0b0f19] p-4">
            <p className="font-semibold text-white">
              Affected Students Preview: {outgoingStudents.length}
            </p>
            {outgoingStudents.length > 0 && (
              <p className="text-slate-400 mt-1">
                {outgoingStudents.slice(0, 8).map((s) => `${s.diuId || s.studentName}`).join(", ")}
                {outgoingStudents.length > 8 ? ` + ${outgoingStudents.length - 8} more` : ""}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="institution"
            isLoading={reassignBusy}
            disabled={!outgoingAdvisorId || !incomingAdvisorId || outgoingStudents.length === 0}
            onClick={handleBulkReassign}
          >
            Confirm Reassignment ({outgoingStudents.length} Students)
          </Button>
        </div>
      )}

      {/* Individual Student Assignment & History Modal */}
      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ind-asg-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-xl rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden text-xs">
            <div className="flex items-center justify-between border-b border-[#1c263c] px-5 py-4">
              <h2 id="ind-asg-title" className="text-base font-bold text-white">
                {selectedStudent.studentName} ({selectedStudent.diuId || "No ID"})
              </h2>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIndividualSave} className="p-5 space-y-4">
              {indError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-2.5 text-rose-200">
                  {indError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="ind-adv" className="font-medium text-slate-200">
                  Assign / Reassign Advisor *
                </label>
                <select
                  id="ind-adv"
                  required
                  value={indAdvisorId}
                  onChange={(e) => setIndAdvisorId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                >
                  <option value="">-- Select Advisor --</option>
                  {advisors.filter((a) => a.is_active).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="ind-reason" className="font-medium text-slate-200">
                  Reason for Assignment / Change *
                </label>
                <textarea
                  id="ind-reason"
                  required
                  rows={2}
                  value={indReason}
                  onChange={(e) => setIndReason(e.target.value)}
                  placeholder="Mandatory audit reason..."
                  className="w-full rounded-lg border border-[#1c263c] bg-[#0b0f19] p-2.5 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-white">Assignment History</h3>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-[#1c263c] bg-[#0b0f19] divide-y divide-[#1c263c] p-2">
                  {historyLoading ? (
                    <p className="text-slate-400 p-2">Loading history...</p>
                  ) : historyItems.length === 0 ? (
                    <p className="text-slate-400 p-2">No previous history in this semester.</p>
                  ) : (
                    historyItems.map((h) => (
                      <div key={h.id} className="py-2 px-1 flex justify-between gap-2">
                        <div>
                          <div className="font-mono font-semibold text-white">
                            {h.action}: {h.previousAdvisorName || "None"} &rarr; {h.newAdvisorName || "None"}
                          </div>
                          {h.reason && <div className="text-slate-400">{h.reason}</div>}
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c263c]">
                <Button type="button" variant="secondary" onClick={() => setSelectedStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="institution" isLoading={indSaving}>
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
