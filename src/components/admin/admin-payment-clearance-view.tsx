"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  ArrowLeft,
  Layers,
  Edit3,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updatePaymentClearanceStatusAction,
  listPaymentClearancesAction,
  getPaymentAuditTrailAction,
} from "@/app/admin/actions";
import type {
  PaymentClearanceRecord,
  PaymentAuditRecord,
  PaymentStatus,
} from "@/lib/payment/payment-service";

interface AdminPaymentClearanceViewProps {
  initialRecords: PaymentClearanceRecord[];
  initialAudit: PaymentAuditRecord[];
  semesterId?: string;
}

export function AdminPaymentClearanceView({
  initialRecords,
  initialAudit,
  semesterId = "sem-spring-2027",
}: AdminPaymentClearanceViewProps) {
  const [records, setRecords] = React.useState<PaymentClearanceRecord[]>(initialRecords);
  const [auditTrail, setAuditTrail] = React.useState<PaymentAuditRecord[]>(initialAudit);
  const [activeTab, setActiveTab] = React.useState<"ALL" | PaymentStatus>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal / Dialog state for updating clearance
  const [editingStudent, setEditingStudent] = React.useState<PaymentClearanceRecord | null>(null);
  const [newStatus, setNewStatus] = React.useState<PaymentStatus>("cleared");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);
  const [showAuditDrawer, setShowAuditDrawer] = React.useState(false);

  // Status counts
  const counts = React.useMemo(() => {
    return {
      all: records.length,
      awaiting: records.filter((r) => r.status === "awaiting_verification").length,
      cleared: records.filter((r) => r.status === "cleared").length,
      not_cleared: records.filter((r) => r.status === "not_cleared").length,
    };
  }, [records]);

  // Filtered records
  const filteredRecords = React.useMemo(() => {
    let list = records;
    if (activeTab !== "ALL") {
      list = list.filter((r) => r.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentDiuId.toLowerCase().includes(q) ||
          (r.referenceCode && r.referenceCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [records, activeTab, searchQuery]);

  // Open edit modal
  const handleOpenEdit = (rec: PaymentClearanceRecord) => {
    setEditingStudent(rec);
    setNewStatus(rec.status);
    setAdminNotes(rec.notes || "");
  };

  // Submit status update
  const handleSaveStatus = async () => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await updatePaymentClearanceStatusAction(
        editingStudent.studentId,
        semesterId,
        newStatus,
        adminNotes
      );

      if (!res.success) {
        setFeedback({ text: res.error || "Failed to update payment clearance.", type: "warning" });
        setIsSubmitting(false);
        return;
      }

      setFeedback({
        text: `Successfully updated payment clearance for ${editingStudent.studentName} to "${newStatus.replace("_", " ")}".`,
        type: "success",
      });

      // Reload records & audit
      const updatedList = await listPaymentClearancesAction(semesterId);
      if (updatedList.success && updatedList.records) {
        setRecords(updatedList.records);
      }
      const updatedAudit = await getPaymentAuditTrailAction(undefined, semesterId);
      if (updatedAudit.success && updatedAudit.records) {
        setAuditTrail(updatedAudit.records);
      }

      setEditingStudent(null);
    } catch {
      setFeedback({ text: "Server error occurred while updating status.", type: "warning" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Top Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Student Tuition Accounts Clearance Center
            </h1>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Finance & Accounts clearance verification for Spring 2027 course advising. Verified statuses reflect instantly in student and advisor portals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className="text-xs border-[#1c263c] text-slate-300 hover:text-white"
          >
            <History className="h-3.5 w-3.5 mr-1 text-slate-400" />
            <span>Audit Trail ({auditTrail.length})</span>
          </Button>
          <Link
            href="/admin/curriculum"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1c263c] hover:bg-[#1a233a] transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Batch Courses</span>
          </Link>
          <Link
            href="/admin"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1c263c] hover:bg-[#1a233a] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Admin Center</span>
          </Link>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
            feedback.type === "success"
              ? "bg-[#121827] border-emerald-800 text-emerald-300"
              : "bg-[#121827] border-amber-800 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Status Tabs */}
          <div className="inline-flex rounded-lg bg-[#0b0f19] p-0.5 border border-[#1c263c] text-xs">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "ALL" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Students ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("awaiting_verification")}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "awaiting_verification" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Awaiting Verification ({counts.awaiting})
            </button>
            <button
              onClick={() => setActiveTab("cleared")}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "cleared" ? "bg-[#008764] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Cleared ({counts.cleared})
            </button>
            <button
              onClick={() => setActiveTab("not_cleared")}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "not_cleared" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Not Cleared ({counts.not_cleared})
            </button>
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or DIU ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table: Student Payment Statuses */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1c263c]">
              <tr>
                <th className="py-3 px-4">Student Scholar</th>
                <th className="py-3 px-4">DIU ID & Batch</th>
                <th className="py-3 px-4">Clearance Status</th>
                <th className="py-3 px-4">Accounts Reference</th>
                <th className="py-3 px-4">Verification Audit</th>
                <th className="py-3 px-4">Remarks / Hold Reason</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No student payment records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#172136]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {r.studentName}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-400 font-bold block">{r.studentDiuId}</span>
                      <span className="text-[10px] text-slate-500">Batch {r.studentBatch}</span>
                    </td>
                    <td className="py-3 px-4">
                      {r.status === "cleared" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold text-[11px]">
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Cleared</span>
                        </span>
                      )}
                      {r.status === "awaiting_verification" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold text-[11px]">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Awaiting</span>
                        </span>
                      )}
                      {r.status === "not_cleared" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 font-semibold text-[11px]">
                          <AlertCircle className="h-3 w-3 text-rose-400" />
                          <span>Not Cleared</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                      {r.referenceCode || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#8e9db2]">
                      {r.verifiedAt ? (
                        <div>
                          <span className="text-slate-300 block">{r.verifiedByName || "Finance Officer"}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(r.verifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Pending review</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#8e9db2] max-w-xs truncate">
                      {r.notes || "No remarks"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(r)}
                        className="h-7 text-xs border-[#1c263c] text-slate-200 hover:text-white hover:bg-[#1a233a]"
                      >
                        <Edit3 className="h-3 w-3 mr-1 text-blue-400" />
                        <span>Update</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Clearance Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-xl">
            <div className="space-y-1 border-b border-[#1c263c] pb-3">
              <h2 className="text-base font-bold text-white">
                Update Tuition Clearance Status
              </h2>
              <p className="text-xs text-[#8e9db2]">
                Student: <strong className="text-white">{editingStudent.studentName}</strong> ({editingStudent.studentDiuId})
              </p>
            </div>

            {/* Status Radio Choices */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Accounts Clearance Decision:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStatus("cleared")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    newStatus === "cleared"
                      ? "bg-emerald-950 border-emerald-600 text-emerald-200 shadow-xs"
                      : "bg-[#0b0f19] border-[#1c263c] text-slate-400 hover:text-white"
                  }`}
                >
                  Cleared
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus("awaiting_verification")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    newStatus === "awaiting_verification"
                      ? "bg-amber-950 border-amber-600 text-amber-200 shadow-xs"
                      : "bg-[#0b0f19] border-[#1c263c] text-slate-400 hover:text-white"
                  }`}
                >
                  Awaiting
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus("not_cleared")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    newStatus === "not_cleared"
                      ? "bg-rose-950 border-rose-600 text-rose-200 shadow-xs"
                      : "bg-[#0b0f19] border-[#1c263c] text-slate-400 hover:text-white"
                  }`}
                >
                  Hold
                </button>
              </div>
            </div>

            {/* Remarks / Hold Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Administrative Audit Remarks:
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified deposit slip via Bank Asia branch / Previous term dues pending..."
                rows={3}
                className="w-full p-2.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStudent(null)}
                className="text-xs border-[#1c263c] text-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleSaveStatus}
                className="bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs px-4"
              >
                {isSubmitting ? "Saving..." : "Confirm & Record Audit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Drawer / Expandable Panel */}
      {showAuditDrawer && (
        <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#1c263c] pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-white">
                Tuition Accounts Immutable Audit Log
              </h2>
            </div>
            <button
              onClick={() => setShowAuditDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {auditTrail.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-lg bg-[#0b0f19] border border-[#1c263c] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      Status Change: <strong className="text-white capitalize">{a.previousStatus?.replace("_", " ") || "Initial"}</strong> &rarr; <strong className="text-emerald-400 capitalize">{a.newStatus.replace("_", " ")}</strong>
                    </span>
                  </div>
                  {a.notes && <p className="text-[11px] text-[#8e9db2]">{a.notes}</p>}
                </div>
                <div className="text-[10px] font-mono text-slate-500 shrink-0 text-right">
                  <div>{a.actorName || "Accounts Officer"}</div>
                  <div>{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
