"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit3,
  Power,
  Search,
  AlertCircle,
  X,
  DatabaseZap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createBatchAction,
  updateBatchAction,
  toggleBatchActiveAction,
} from "@/app/admin/batches/actions";
import type { BatchDirectoryItem, DepartmentRow } from "@/lib/admin/admin-service";

interface BatchManagementViewProps {
  available: boolean;
  errorMessage?: string;
  initialBatches: BatchDirectoryItem[];
  departments: DepartmentRow[];
}

export function BatchManagementView({
  available,
  errorMessage,
  initialBatches,
  departments,
}: BatchManagementViewProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<BatchDirectoryItem | null>(null);
  const [formState, setFormState] = React.useState({
    batchLabel: "",
    batchNumber: "",
    departmentCode: "",
    isActive: true,
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [toggleTarget, setToggleTarget] = React.useState<BatchDirectoryItem | null>(null);
  const [toggleReason, setToggleReason] = React.useState("");
  const [toggleError, setToggleError] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialBatches.filter((b) => {
      if (deptFilter !== "all" && (b.department_code || "") !== deptFilter) return false;
      if (!q) return true;
      return (
        b.batch_label.toLowerCase().includes(q) ||
        (b.batch_number || "").toLowerCase().includes(q) ||
        (b.department_code || "").toLowerCase().includes(q)
      );
    });
  }, [initialBatches, search, deptFilter]);

  const openCreate = () => {
    setEditingBatch(null);
    setFormState({
      batchLabel: "",
      batchNumber: "",
      departmentCode: departments[0]?.code || "",
      isActive: true,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (b: BatchDirectoryItem) => {
    setEditingBatch(b);
    setFormState({
      batchLabel: b.batch_label,
      batchNumber: b.batch_number || "",
      departmentCode: b.department_code || "",
      isActive: b.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = editingBatch
      ? await updateBatchAction({ id: editingBatch.id, ...formState })
      : await createBatchAction(formState);

    setSaving(false);
    if (!res.success) {
      setFormError(res.error || "Failed to save batch.");
      return;
    }

    setFormOpen(false);
    router.refresh();
  };

  const handleToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleTarget) return;
    setToggleError(null);
    setToggling(true);

    const res = await toggleBatchActiveAction({
      id: toggleTarget.id,
      isActive: !toggleTarget.is_active,
      reason: toggleReason,
    });

    setToggling(false);
    if (!res.success) {
      setToggleError(res.error || "Failed to update batch status.");
      return;
    }

    setToggleTarget(null);
    setToggleReason("");
    router.refresh();
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <Users className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Batch Management
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Manage official DIU cohort labels, normalized batch numbers, student counts, and advisor distributions.
          </p>
        </div>

        <Button type="button" variant="institution" onClick={openCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          <span>Create Batch</span>
        </Button>
      </div>

      {!available && (
        <div
          role="alert"
          className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-3 text-xs text-rose-200"
        >
          <DatabaseZap className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Batch Directory Unavailable</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch label or number..."
            aria-label="Search batches"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1c263c] bg-[#0b0f19] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter batches by department"
          className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f1523] border-b border-[#1c263c] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Batch Label
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Normalized #
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Students &amp; Advisors
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Eligible Semesters
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#8e9db2]">
                    No batches found. Create a batch or import an advisor roster to populate cohorts.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-[#172136]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{b.batch_label}</div>
                      <div className="text-slate-400 mt-0.5">
                        {b.department_code || "All Departments"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400">
                      {b.batch_number || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-white">
                        {b.studentCount} students ({b.assignedStudentCount} assigned)
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {b.advisorCount} advisor{b.advisorCount === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {b.eligibleSemesterNames.length > 0
                        ? b.eligibleSemesterNames.join(", ")
                        : "None configured"}
                    </td>
                    <td className="px-4 py-3.5">
                      {b.is_active ? (
                        <span className="inline-flex items-center rounded-md border border-[#064e3b] bg-[#062822] px-2 py-0.5 font-medium text-[#10b981]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-[#881337] bg-[#2e1014] px-2 py-0.5 font-medium text-rose-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/assignments?batch=${encodeURIComponent(b.batch_number || b.batch_label)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#1c263c] bg-[#0b0f19] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#172136]"
                        >
                          <span>Assignments</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(b)}
                          aria-label={`Edit batch ${b.batch_label}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={b.is_active ? "destructive" : "default"}
                          onClick={() => {
                            setToggleTarget(b);
                            setToggleReason("");
                            setToggleError(null);
                          }}
                          aria-label={b.is_active ? `Deactivate ${b.batch_label}` : `Activate ${b.batch_label}`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-form-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1c263c] px-5 py-4">
              <h2 id="batch-form-title" className="text-base font-bold text-white">
                {editingBatch ? "Edit Batch" : "Create Batch"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3 text-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="batch-label" className="font-medium text-slate-200">
                  Official Batch Label *
                </label>
                <input
                  id="batch-label"
                  required
                  value={formState.batchLabel}
                  onChange={(e) => setFormState({ ...formState, batchLabel: e.target.value })}
                  placeholder="e.g. 72 Batch"
                  className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="batch-number" className="font-medium text-slate-200">
                    Normalized Number
                  </label>
                  <input
                    id="batch-number"
                    value={formState.batchNumber}
                    onChange={(e) => setFormState({ ...formState, batchNumber: e.target.value })}
                    placeholder="e.g. 72"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="batch-dept" className="font-medium text-slate-200">
                    Department
                  </label>
                  <select
                    id="batch-dept"
                    value={formState.departmentCode}
                    onChange={(e) => setFormState({ ...formState, departmentCode: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  >
                    <option value="">All / Shared</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c263c]">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="institution" isLoading={saving}>
                  {editingBatch ? "Save Batch" : "Create Batch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Active Dialog */}
      {toggleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-batch-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl p-5 space-y-4 text-xs">
            <h2 id="toggle-batch-title" className="text-base font-bold text-white">
              {toggleTarget.is_active ? "Deactivate Batch" : "Activate Batch"}
            </h2>
            <p className="text-[#8e9db2]">
              Confirm status change for <span className="text-white font-semibold">{toggleTarget.batch_label}</span>.
            </p>
            <form onSubmit={handleToggle} className="space-y-3">
              {toggleError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-2.5 text-rose-200">
                  {toggleError}
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="batch-toggle-reason" className="font-medium text-slate-200">
                  Audit Reason *
                </label>
                <textarea
                  id="batch-toggle-reason"
                  required
                  rows={2}
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  className="w-full rounded-lg border border-[#1c263c] bg-[#0b0f19] p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setToggleTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={toggleTarget.is_active ? "destructive" : "institution"}
                  isLoading={toggling}
                >
                  Confirm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
