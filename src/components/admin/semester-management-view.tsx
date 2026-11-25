"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, CheckCircle2, Archive, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSemesterAction,
  setActiveSemesterAction,
  archiveSemesterAction,
} from "@/app/admin/semesters/actions";
import type { SemesterRow } from "@/lib/admin/admin-service";

export interface SemesterWithStats extends SemesterRow {
  assignmentCount: number;
  paymentCount: number;
  courseConfigCount: number;
}

export function SemesterManagementView({
  semesters,
}: {
  semesters: SemesterWithStats[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    year: new Date().getFullYear(),
    season: "fall" as "spring" | "summer" | "fall",
    registrationStartsAt: "",
    registrationEndsAt: "",
    isActive: false,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await createSemesterAction(form);
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Failed to create semester.");
      return;
    }
    setModalOpen(false);
    router.refresh();
  };

  const handleActivate = async (id: string) => {
    setError(null);
    const res = await setActiveSemesterAction(id);
    if (!res.success) {
      setError(res.error || "Failed to activate semester.");
      return;
    }
    router.refresh();
  };

  const handleArchive = async (id: string) => {
    setError(null);
    const res = await archiveSemesterAction(id);
    if (!res.success) {
      setError(res.error || "Failed to archive semester.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <Calendar className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Semester Management
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Configure academic semesters, registration window dates, active term selection, and non-destructive archiving.
          </p>
        </div>

        <Button type="button" variant="institution" onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Semester</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-[#881337] bg-[#2e1014] p-3 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0f1523] border-b border-[#1c263c]">
              <tr>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Semester</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Code</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Registration Window</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Associated Records</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Status</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {semesters.map((s) => (
                <tr key={s.id} className="hover:bg-[#172136]/50">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">
                      {s.name || `${s.season.charAt(0).toUpperCase() + s.season.slice(1)} ${s.year}`}
                    </div>
                    <div className="text-slate-400 font-mono">
                      {s.season.toUpperCase()} {s.year}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-400">{s.code || "—"}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">
                    {s.registration_starts_at ? new Date(s.registration_starts_at).toLocaleDateString() : "Unset"} &rarr;{" "}
                    {s.registration_ends_at ? new Date(s.registration_ends_at).toLocaleDateString() : "Unset"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">
                    {s.assignmentCount} assignments • {s.courseConfigCount} courses • {s.paymentCount} clearances
                  </td>
                  <td className="px-4 py-3.5">
                    {s.is_active ? (
                      <span className="rounded border border-[#064e3b] bg-[#062822] px-2 py-0.5 text-[#10b981]">
                        Active
                      </span>
                    ) : s.is_archived ? (
                      <span className="rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-0.5 text-slate-400">
                        Archived
                      </span>
                    ) : (
                      <span className="rounded border border-[#78350f] bg-[#2b200b] px-2 py-0.5 text-amber-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    {!s.is_active && !s.is_archived && (
                      <Button type="button" size="sm" variant="institution" onClick={() => handleActivate(s.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Set Active
                      </Button>
                    )}
                    {!s.is_archived && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleArchive(s.id)}>
                        <Archive className="h-3.5 w-3.5 mr-1" />
                        Archive
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden text-xs">
            <div className="flex items-center justify-between border-b border-[#1c263c] px-5 py-4">
              <h2 className="text-base font-bold text-white">Create Semester</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="sem-name" className="font-medium text-slate-200">Name *</label>
                  <input
                    id="sem-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Fall 2026"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="sem-code" className="font-medium text-slate-200">Code *</label>
                  <input
                    id="sem-code"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. FA26"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="sem-season" className="font-medium text-slate-200">Season *</label>
                  <select
                    id="sem-season"
                    value={form.season}
                    onChange={(e) => setForm({ ...form, season: e.target.value as "spring" | "summer" | "fall" })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  >
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="sem-year" className="font-medium text-slate-200">Year *</label>
                  <input
                    id="sem-year"
                    type="number"
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="sem-start" className="font-medium text-slate-200">Registration Opens</label>
                  <input
                    id="sem-start"
                    type="date"
                    value={form.registrationStartsAt}
                    onChange={(e) => setForm({ ...form, registrationStartsAt: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="sem-end" className="font-medium text-slate-200">Registration Closes</label>
                  <input
                    id="sem-end"
                    type="date"
                    value={form.registrationEndsAt}
                    onChange={(e) => setForm({ ...form, registrationEndsAt: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>Set as active registration semester immediately</span>
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1c263c]">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="institution" isLoading={saving}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
