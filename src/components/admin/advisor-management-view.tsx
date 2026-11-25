"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Search,
  Plus,
  Edit3,
  Power,
  Eye,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  X,
  DatabaseZap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createAdvisorAction,
  updateAdvisorAction,
  toggleAdvisorActiveAction,
  getAdvisorDetailAction,
  type AdvisorDetailPayload,
} from "@/app/admin/advisors/actions";
import type {
  AdvisorDirectoryItem,
  DepartmentRow,
  SemesterRow,
} from "@/lib/admin/admin-service";

interface AdvisorManagementViewProps {
  available: boolean;
  errorMessage?: string;
  initialAdvisors: AdvisorDirectoryItem[];
  departments: DepartmentRow[];
  semesters: SemesterRow[];
}

export function AdvisorManagementView({
  available,
  errorMessage,
  initialAdvisors,
  departments,
  semesters,
}: AdvisorManagementViewProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [semesterFilter, setSemesterFilter] = React.useState("all");

  // Form Modal State
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAdvisor, setEditingAdvisor] = React.useState<AdvisorDirectoryItem | null>(null);
  const [formState, setFormState] = React.useState({
    fullName: "",
    designation: "",
    email: "",
    phone: "",
    roomNumber: "",
    schedule: "",
    departmentCode: "",
    employeeId: "",
    isActive: true,
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Toggle Active Dialog
  const [toggleTarget, setToggleTarget] = React.useState<AdvisorDirectoryItem | null>(null);
  const [toggleReason, setToggleReason] = React.useState("");
  const [toggleError, setToggleError] = React.useState<string | null>(null);
  const [toggling, setToggling] = React.useState(false);

  // Detail Drawer
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailData, setDetailData] = React.useState<AdvisorDetailPayload | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialAdvisors.filter((adv) => {
      if (deptFilter !== "all" && (adv.department_code || "") !== deptFilter) return false;
      if (statusFilter === "active" && !adv.is_active) return false;
      if (statusFilter === "inactive" && adv.is_active) return false;
      if (semesterFilter !== "all" && !adv.assignedSemesterIds.includes(semesterFilter)) return false;
      if (!q) return true;
      return (
        adv.full_name.toLowerCase().includes(q) ||
        adv.email.toLowerCase().includes(q) ||
        (adv.designation || "").toLowerCase().includes(q) ||
        (adv.employee_id || "").toLowerCase().includes(q)
      );
    });
  }, [initialAdvisors, search, deptFilter, statusFilter, semesterFilter]);

  const openCreateModal = () => {
    setEditingAdvisor(null);
    setFormState({
      fullName: "",
      designation: "",
      email: "",
      phone: "",
      roomNumber: "",
      schedule: "",
      departmentCode: departments[0]?.code || "",
      employeeId: "",
      isActive: true,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (adv: AdvisorDirectoryItem) => {
    setEditingAdvisor(adv);
    setFormState({
      fullName: adv.full_name,
      designation: adv.designation || "",
      email: adv.email,
      phone: adv.phone || "",
      roomNumber: adv.room_number || "",
      schedule: adv.schedule || "",
      departmentCode: adv.department_code || "",
      employeeId: adv.employee_id || "",
      isActive: adv.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = editingAdvisor
      ? await updateAdvisorAction({ id: editingAdvisor.id, ...formState })
      : await createAdvisorAction(formState);

    setSaving(false);
    if (!res.success) {
      setFormError(res.error || "Failed to save advisor.");
      return;
    }

    setFormOpen(false);
    router.refresh();
  };

  const handleToggleActive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toggleTarget) return;
    setToggleError(null);
    setToggling(true);

    const res = await toggleAdvisorActiveAction({
      id: toggleTarget.id,
      isActive: !toggleTarget.is_active,
      reason: toggleReason,
    });

    setToggling(false);
    if (!res.success) {
      setToggleError(res.error || "Failed to update advisor status.");
      return;
    }

    setToggleTarget(null);
    setToggleReason("");
    router.refresh();
  };

  const openDetail = async (adv: AdvisorDirectoryItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    const res = await getAdvisorDetailAction(adv.id);
    setDetailLoading(false);
    if (!res.success || !res.data) {
      setDetailError(res.error || "Unable to load advisor details.");
      return;
    }
    setDetailData(res.data);
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <UserCheck className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Advisor Directory &amp; Management
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Manage faculty advisors, contact details, active status, Auth identity linkage, and assigned student cohorts.
          </p>
        </div>

        <Button
          type="button"
          variant="institution"
          onClick={openCreateModal}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Advisor</span>
        </Button>
      </div>

      {!available && (
        <div
          role="alert"
          className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-3 text-xs text-rose-200"
        >
          <DatabaseZap className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Advisor Directory Unavailable</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, designation, ID..."
            aria-label="Search advisors"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1c263c] bg-[#0b0f19] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter by department"
          className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          aria-label="Filter by assigned semester"
          className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Semesters</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `${s.season} ${s.year}`}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          aria-label="Filter by active status"
          className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Advisors Table */}
      <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f1523] border-b border-[#1c263c] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Advisor
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contact &amp; Room
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Auth Identity
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Assigned Load
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
                    No advisors match the current search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((adv) => (
                  <tr key={adv.id} className="hover:bg-[#172136]/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white">{adv.full_name}</div>
                      <div className="text-slate-400 mt-0.5">
                        {adv.designation || "Faculty Advisor"}
                        {adv.department_code ? ` • ${adv.department_code}` : ""}
                        {adv.employee_id ? ` • ID: ${adv.employee_id}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 space-y-1">
                      <div className="font-mono text-slate-200">{adv.email}</div>
                      <div className="text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                        {adv.phone && <span>{adv.phone}</span>}
                        {adv.room_number && <span>Room: {adv.room_number}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {adv.authLinked ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#064e3b] bg-[#062822] px-2 py-0.5 font-medium text-[#10b981]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Linked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#1c263c] bg-[#0b0f19] px-2 py-0.5 font-medium text-slate-400">
                          <ShieldAlert className="h-3 w-3" />
                          <span>Directory Only</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-semibold text-white">
                        {adv.assignedStudentCount} students
                      </div>
                      {adv.assignedBatches.length > 0 && (
                        <div className="text-slate-400 mt-0.5">
                          Batches: {adv.assignedBatches.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {adv.is_active ? (
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
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openDetail(adv)}
                          aria-label={`View details for ${adv.full_name}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(adv)}
                          aria-label={`Edit ${adv.full_name}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={adv.is_active ? "destructive" : "default"}
                          onClick={() => {
                            setToggleTarget(adv);
                            setToggleReason("");
                            setToggleError(null);
                          }}
                          aria-label={adv.is_active ? `Deactivate ${adv.full_name}` : `Activate ${adv.full_name}`}
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
          aria-labelledby="advisor-form-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1c263c] px-5 py-4">
              <h2 id="advisor-form-title" className="text-base font-bold text-white">
                {editingAdvisor ? "Edit Advisor Profile" : "Add Faculty Advisor"}
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

            <form onSubmit={handleSaveAdvisor} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3 text-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="adv-name" className="font-medium text-slate-200">
                    Full Name *
                  </label>
                  <input
                    id="adv-name"
                    required
                    value={formState.fullName}
                    onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="adv-designation" className="font-medium text-slate-200">
                    Designation
                  </label>
                  <input
                    id="adv-designation"
                    value={formState.designation}
                    onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                    placeholder="e.g. Assistant Professor"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="adv-email" className="font-medium text-slate-200">
                    Email Address *
                  </label>
                  <input
                    id="adv-email"
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="adv-phone" className="font-medium text-slate-200">
                    Phone
                  </label>
                  <input
                    id="adv-phone"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="Preserve leading zeros"
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="adv-dept" className="font-medium text-slate-200">
                    Department
                  </label>
                  <select
                    id="adv-dept"
                    value={formState.departmentCode}
                    onChange={(e) => setFormState({ ...formState, departmentCode: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="adv-emp-id" className="font-medium text-slate-200">
                    Employee ID
                  </label>
                  <input
                    id="adv-emp-id"
                    value={formState.employeeId}
                    onChange={(e) => setFormState({ ...formState, employeeId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="adv-room" className="font-medium text-slate-200">
                    Room Number
                  </label>
                  <input
                    id="adv-room"
                    value={formState.roomNumber}
                    onChange={(e) => setFormState({ ...formState, roomNumber: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="adv-schedule" className="font-medium text-slate-200">
                  Advising Schedule
                </label>
                <input
                  id="adv-schedule"
                  value={formState.schedule}
                  onChange={(e) => setFormState({ ...formState, schedule: e.target.value })}
                  placeholder="e.g. Sun–Tue 10:00 AM – 1:00 PM"
                  className="w-full h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c263c]">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="institution" isLoading={saving}>
                  {editingAdvisor ? "Save Changes" : "Create Advisor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirmation Dialog */}
      {toggleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-advisor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1c263c] bg-[#121827] shadow-2xl p-5 space-y-4 text-xs">
            <h2 id="toggle-advisor-title" className="text-base font-bold text-white">
              {toggleTarget.is_active ? "Deactivate Advisor" : "Activate Advisor"}
            </h2>
            <p className="text-[#8e9db2]">
              {toggleTarget.is_active
                ? `Deactivating ${toggleTarget.full_name} marks them inactive in the advisor directory.`
                : `Reactivating ${toggleTarget.full_name} restores them to active advisor status.`}
            </p>
            <form onSubmit={handleToggleActive} className="space-y-3">
              {toggleError && (
                <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-2.5 text-rose-200">
                  {toggleError}
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="toggle-reason" className="font-medium text-slate-200">
                  Audit Reason *
                </label>
                <textarea
                  id="toggle-reason"
                  required
                  rows={2}
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  placeholder="Provide reason for audit trail..."
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

      {/* Detail Modal */}
      {detailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="advisor-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/75"
        >
          <div className="h-full w-full max-w-2xl bg-[#121827] border-l border-[#1c263c] p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#1c263c] pb-4">
              <h2 id="advisor-detail-title" className="text-lg font-bold text-white">
                Advisor Assignment &amp; Profile Details
              </h2>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close detail panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading && <p className="text-xs text-[#8e9db2]">Loading advisor details...</p>}
            {detailError && (
              <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3 text-xs text-rose-200">
                {detailError}
              </div>
            )}

            {detailData && (
              <div className="space-y-6 text-xs">
                <div className="rounded-xl border border-[#1c263c] bg-[#0b0f19] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{detailData.advisor.full_name}</h3>
                    <span className="font-mono text-slate-300">
                      {detailData.advisor.profile_id ? "Auth Linked" : "Directory Only (Not Auth Linked)"}
                    </span>
                  </div>
                  <p className="text-[#8e9db2]">
                    {detailData.advisor.designation || "Advisor"} •{" "}
                    {detailData.advisor.department_code || "No Department"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-slate-300">
                    <div className="flex items-center gap-2 font-mono">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{detailData.advisor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{detailData.advisor.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>Room: {detailData.advisor.room_number || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{detailData.advisor.schedule || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white">
                    Currently Assigned Students ({detailData.assignedStudents.length})
                  </h4>
                  {detailData.assignedStudents.length === 0 ? (
                    <p className="text-[#8e9db2]">No active student assignments.</p>
                  ) : (
                    <div className="rounded-xl border border-[#1c263c] divide-y divide-[#1c263c] bg-[#0b0f19]">
                      {detailData.assignedStudents.map((st) => (
                        <div key={st.assignmentId} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{st.fullName}</div>
                            <div className="font-mono text-emerald-400">
                              {st.diuId || "No DIU ID"} • Batch {st.batch || "—"}
                            </div>
                          </div>
                          <div className="text-right text-slate-400 font-mono">
                            <div>{st.semesterLabel}</div>
                            <div>{st.assignmentRuleType}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white">
                    Assignment History ({detailData.history.length})
                  </h4>
                  {detailData.history.length === 0 ? (
                    <p className="text-[#8e9db2]">No assignment history recorded.</p>
                  ) : (
                    <div className="rounded-xl border border-[#1c263c] divide-y divide-[#1c263c] bg-[#0b0f19]">
                      {detailData.history.map((h) => (
                        <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-mono font-semibold text-white">
                              {h.action} — {h.studentName} ({h.studentDiuId || "No ID"})
                            </div>
                            {h.reason && <div className="text-slate-400 mt-0.5">{h.reason}</div>}
                          </div>
                          <div className="text-right font-mono text-slate-400">
                            <div>{h.semesterLabel}</div>
                            <div>{new Date(h.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
