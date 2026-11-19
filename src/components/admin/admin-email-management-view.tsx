"use client";

import * as React from "react";
import {
  ShieldCheck,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  History,
  Search,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  addAlternativeEmailAction,
  updateAlternativeEmailStatusAction,
  removeAlternativeEmailAction,
} from "@/app/admin/actions";
import type { AuthorizedEmailRow, EmailAuthorizationAuditRow } from "@/lib/mock/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentEntry {
  profileId: string;
  fullName: string;
  diuId: string;
  primaryEmail: string;
  batch: string;
  department: string;
}

interface AdminEmailManagementViewProps {
  initialStudents: StudentEntry[];
  initialAuthorizedEmails: AuthorizedEmailRow[];
  initialAuditLog: EmailAuthorizationAuditRow[];
}

export function AdminEmailManagementView({
  initialStudents,
  initialAuthorizedEmails,
  initialAuditLog,
}: AdminEmailManagementViewProps) {
  const [students] = React.useState<StudentEntry[]>(initialStudents);
  const [authorizedEmails, setAuthorizedEmails] = React.useState<AuthorizedEmailRow[]>(initialAuthorizedEmails);
  const [auditLog, setAuditLog] = React.useState<EmailAuthorizationAuditRow[]>(initialAuditLog);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"students" | "audit">("students");

  // Modal State: Add Alternative Email
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentEntry | null>(null);
  const [newEmail, setNewEmail] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Modal State: Remove Email Confirmation
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);
  const [selectedAuthEmail, setSelectedAuthEmail] = React.useState<AuthorizedEmailRow | null>(null);
  const [removeReason, setRemoveReason] = React.useState("");

  // Toast State
  const [toast, setToast] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchesName = s.fullName.toLowerCase().includes(q);
    const matchesId = s.diuId.toLowerCase().includes(q);
    const matchesPrimary = s.primaryEmail.toLowerCase().includes(q);
    const matchesAlt = authorizedEmails.some(
      (a) => a.profile_id === s.profileId && a.email.toLowerCase().includes(q)
    );
    return matchesName || matchesId || matchesPrimary || matchesAlt;
  });

  // KPI Statistics
  const totalExceptions = authorizedEmails.filter((a) => a.email_type === "alternative_personal").length;
  const activeExceptions = authorizedEmails.filter((a) => a.email_type === "alternative_personal" && a.is_active).length;
  const deactivatedExceptions = totalExceptions - activeExceptions;

  // Handler: Open Add Modal
  const handleOpenAdd = (student: StudentEntry) => {
    setSelectedStudent(student);
    setNewEmail("");
    setReason("");
    setFormError(null);
    setIsAddOpen(true);
  };

  // Handler: Submit Add Alternative Email
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (!newEmail.trim() || !newEmail.includes("@")) {
      setFormError("Please enter a valid personal Google email address.");
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setFormError("Mandatory authorization reason must contain at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await addAlternativeEmailAction({
      profileId: selectedStudent.profileId,
      email: newEmail.trim(),
      reason: reason.trim(),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Failed to authorize alternative email.");
      return;
    }

    if (res.data) {
      setAuthorizedEmails((prev) => [...prev, res.data as AuthorizedEmailRow]);
      setAuditLog((prev) => [
        {
          id: `audit-${Date.now()}`,
          authorized_email_id: (res.data as AuthorizedEmailRow).id,
          profile_id: selectedStudent.profileId,
          email: (res.data as AuthorizedEmailRow).email,
          action: "AUTHORIZED",
          actor_id: "admin-registrar-01",
          reason: reason.trim(),
          metadata: { assignedRole: "student", diuId: selectedStudent.diuId },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setIsAddOpen(false);
    setToast({ text: `Authorized "${newEmail.trim()}" for ${selectedStudent.fullName}.`, type: "success" });
  };

  // Handler: Toggle Active / Inactive
  const handleToggleStatus = async (authEmail: AuthorizedEmailRow) => {
    const nextState = !authEmail.is_active;
    const actionReason = nextState
      ? "Administrative reactivation after clearance verification"
      : "Administrative temporary access suspension";

    const res = await updateAlternativeEmailStatusAction({
      authorizedEmailId: authEmail.id,
      isActive: nextState,
      reason: actionReason,
    });

    if (res.success) {
      setAuthorizedEmails((prev) =>
        prev.map((item) => (item.id === authEmail.id ? { ...item, is_active: nextState } : item))
      );
      setAuditLog((prev) => [
        {
          id: `audit-${Date.now()}`,
          authorized_email_id: authEmail.id,
          profile_id: authEmail.profile_id,
          email: authEmail.email,
          action: nextState ? "REACTIVATED" : "DEACTIVATED",
          actor_id: "admin-registrar-01",
          reason: actionReason,
          metadata: { previousState: authEmail.is_active, newState: nextState },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setToast({
        text: `Email "${authEmail.email}" is now ${nextState ? "Active" : "Deactivated (Revoked)"}.`,
        type: "success",
      });
    } else {
      setToast({ text: res.error || "Failed to update email status.", type: "error" });
    }
  };

  // Handler: Open Remove Modal
  const handleOpenRemove = (authEmail: AuthorizedEmailRow) => {
    setSelectedAuthEmail(authEmail);
    setRemoveReason("Student graduated / academic exception period ended");
    setIsRemoveOpen(true);
  };

  // Handler: Confirm Remove
  const handleConfirmRemove = async () => {
    if (!selectedAuthEmail) return;

    const res = await removeAlternativeEmailAction({
      authorizedEmailId: selectedAuthEmail.id,
      reason: removeReason.trim() || "Administrative removal of alternative email authorization",
    });

    if (res.success) {
      setAuthorizedEmails((prev) => prev.filter((item) => item.id !== selectedAuthEmail.id));
      setAuditLog((prev) => [
        {
          id: `audit-${Date.now()}`,
          authorized_email_id: selectedAuthEmail.id,
          profile_id: selectedAuthEmail.profile_id,
          email: selectedAuthEmail.email,
          action: "REVOKED",
          actor_id: "admin-registrar-01",
          reason: removeReason.trim() || "Administrative removal",
          metadata: { revokedRecord: selectedAuthEmail },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setIsRemoveOpen(false);
      setToast({ text: `Revoked authorization for "${selectedAuthEmail.email}".`, type: "success" });
    } else {
      setToast({ text: res.error || "Failed to remove email authorization.", type: "error" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs flex items-center gap-2 shadow-2xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
              : "bg-rose-950/90 border-rose-800 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c263c] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </span>
            <span className="text-xs text-[#8e9db2]">•</span>
            <span className="text-xs text-[#8e9db2] font-mono">Multi-Email Authorization Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Student Identity & Email Management
          </h1>
          <p className="text-xs text-[#8e9db2]">
            Authoritatively authorize, audit, and revoke personal Google email exceptions for Daffodil International University scholars.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-[#121827] border border-[#1c263c] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-[#1c263c] text-white shadow-xs"
                : "text-[#8e9db2] hover:text-white"
            }`}
          >
            Students Directory
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-[#1c263c] text-white shadow-xs"
                : "text-[#8e9db2] hover:text-white"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Log ({auditLog.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] space-y-1">
          <div className="text-[11px] font-medium text-[#8e9db2] uppercase tracking-wider">
            Total Authorized Exceptions
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalExceptions}</div>
          <p className="text-[11px] text-slate-400">Personal Google emails explicitly approved</p>
        </div>

        <div className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] border-l-4 border-l-emerald-500 space-y-1">
          <div className="text-[11px] font-medium text-[#8e9db2] uppercase tracking-wider">
            Active Exception Logins
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{activeExceptions}</div>
          <p className="text-[11px] text-slate-400">Can authenticate to same student profile</p>
        </div>

        <div className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] border-l-4 border-l-rose-500 space-y-1">
          <div className="text-[11px] font-medium text-[#8e9db2] uppercase tracking-wider">
            Revoked / Deactivated
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{deactivatedExceptions}</div>
          <p className="text-[11px] text-slate-400">Immediate access revocation enforced</p>
        </div>
      </div>

      {activeTab === "students" ? (
        /* Students Directory View */
        <div className="rounded-2xl border border-[#1c263c] bg-[#121827] overflow-hidden shadow-xs">
          {/* Table Header Filter Bar */}
          <div className="p-4 border-b border-[#1c263c] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, student ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-[#8e9db2] self-end sm:self-auto">
              Showing <span className="text-white font-mono">{filteredStudents.length}</span> students
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1c263c] bg-[#0b0f19]/60 text-[#8e9db2] uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Student Scholar</th>
                  <th className="py-3 px-4">DIU Student ID</th>
                  <th className="py-3 px-4">Primary Institutional Email</th>
                  <th className="py-3 px-4">Authorized Alternative Email(s)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c263c]">
                {filteredStudents.map((student) => {
                  const studentAlts = authorizedEmails.filter(
                    (a) => a.profile_id === student.profileId && a.email_type === "alternative_personal"
                  );

                  return (
                    <tr key={student.profileId} className="hover:bg-[#172136]/40 transition-colors">
                      {/* Scholar Info */}
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1c263c] flex items-center justify-center text-xs font-bold text-emerald-400">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{student.fullName}</div>
                            <div className="text-[11px] text-[#8e9db2]">{student.batch} • {student.department}</div>
                          </div>
                        </div>
                      </td>

                      {/* DIU Student ID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        {student.diuId}
                      </td>

                      {/* Primary Institutional Email */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0b0f19] border border-[#1e293b] font-mono text-[11px] text-slate-300">
                          <Mail className="h-3 w-3 text-emerald-400" />
                          <span>{student.primaryEmail}</span>
                        </div>
                      </td>

                      {/* Authorized Alternative Emails */}
                      <td className="py-3.5 px-4">
                        {studentAlts.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">No personal exception</span>
                        ) : (
                          <div className="space-y-2">
                            {studentAlts.map((alt) => (
                              <div
                                key={alt.id}
                                className={`p-2 rounded-xl border text-[11px] space-y-1 ${
                                  alt.is_active
                                    ? "bg-slate-900/80 border-slate-700"
                                    : "bg-rose-950/20 border-rose-900/50 opacity-70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-mono font-medium text-white">
                                    <Mail className="h-3 w-3 text-amber-400" />
                                    <span>{alt.email}</span>
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                      alt.is_active
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                        : "bg-rose-950 text-rose-400 border border-rose-800"
                                    }`}
                                  >
                                    {alt.is_active ? "Active" : "Revoked"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#8e9db2] line-clamp-1">
                                  <span className="text-slate-400">Reason:</span> {alt.reason || "Administrative exception"}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                  <span>Auth: {new Date(alt.authorized_at).toLocaleDateString()}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleStatus(alt)}
                                      className="hover:text-amber-400 transition-colors cursor-pointer"
                                      title={alt.is_active ? "Deactivate (Revoke Access)" : "Reactivate Access"}
                                    >
                                      {alt.is_active ? (
                                        <PowerOff className="h-3.5 w-3.5 text-slate-400 hover:text-amber-400" />
                                      ) : (
                                        <Power className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleOpenRemove(alt)}
                                      className="hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Permanently Remove Alternative Email"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdd(student)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c263c] hover:bg-[#253350] text-slate-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Personal Email</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit Log View */
        <div className="rounded-2xl border border-[#1c263c] bg-[#121827] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Immutable Email Authorization Audit Trail</h2>
              <p className="text-xs text-[#8e9db2]">Every addition, status change, and revocation is permanently recorded.</p>
            </div>
            <span className="text-xs font-mono text-[#8e9db2]">{auditLog.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1c263c] bg-[#0b0f19]/60 text-[#8e9db2] uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Email</th>
                  <th className="py-3 px-4">Authorized Reason</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c263c]">
                {auditLog.map((log) => (
                  <tr key={log.id} className="hover:bg-[#172136]/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          log.action === "AUTHORIZED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : log.action === "REACTIVATED"
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : log.action === "DEACTIVATED"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-medium">
                      {log.email}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md">
                      {log.reason}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {log.actor_id || "Registrar Admin"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Alternative Personal Email */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <DialogContent className="max-w-md bg-[#121827] border-[#1c263c] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Authorize Alternative Personal Email</DialogTitle>
            <DialogDescription className="text-xs text-[#8e9db2]">
              Authorize a personal Google account for an existing DIU student. Both emails will resolve to the same profile.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="p-3 rounded-xl bg-[#0b0f19] border border-[#1e293b] space-y-1 text-xs mb-3">
              <div className="font-semibold text-white">{selectedStudent.fullName}</div>
              <div className="text-[11px] text-[#8e9db2]">
                Student ID: <span className="font-mono text-emerald-400">{selectedStudent.diuId}</span> • Primary:{" "}
                <span className="font-mono text-slate-300">{selectedStudent.primaryEmail}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Alternative Personal Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. siyam.personal@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-[#8e9db2]">Must be a valid personal Google account.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Mandatory Authorization Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Official DIU Workspace temporary lockout approved by Dept Head"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-[10px] text-[#8e9db2]">This reason is recorded in the permanent audit trail.</p>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px]">{formError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-2 rounded-xl border border-[#1e293b] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#008764] hover:bg-[#007355] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Authorize Email</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Revocation Confirmation */}
      <Dialog open={isRemoveOpen} onClose={() => setIsRemoveOpen(false)}>
        <DialogContent className="max-w-md bg-[#121827] border-[#1c263c] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Confirm Email Revocation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#8e9db2]">
              Revoking this alternative email will immediately terminate active sessions and prevent further logins with this account.
            </DialogDescription>
          </DialogHeader>

          {selectedAuthEmail && (
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1 text-xs">
              <div className="font-mono text-white font-semibold">{selectedAuthEmail.email}</div>
              <p className="text-[11px] text-rose-300">
                Are you sure you want to permanently revoke this alternative email authorization?
              </p>
            </div>
          )}

          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-slate-200">Revocation Reason</label>
            <input
              type="text"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0b0f19] border border-[#1e293b] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => setIsRemoveOpen(false)}
              className="px-3 py-2 rounded-xl border border-[#1e293b] text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRemove}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Confirm & Revoke Immediately</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
