"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_ADVISOR_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
} from "@/lib/mock/data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  History,
  Eye,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export function AdvisingHistoryView() {
  const reviewedApps = MOCK_ADVISEE_QUEUE.filter((a) => a.registration.reviewed_at !== null);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* 1. Header with Faculty Identity and Active Term */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1c263c] pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="h-7 w-7 text-[#008764]" />
            <span>Review History</span>
          </h1>
          <p className="text-sm text-slate-300">
            Institutional audit trail of all signed course registration determinations made by <strong className="text-white">{MOCK_ADVISOR_PROFILE.full_name}</strong>
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121827] border border-[#1c263c] text-xs font-mono text-slate-300 self-start sm:self-center">
          <Calendar className="h-4 w-4 text-[#008764]" />
          <span>{ACTIVE_MOCK_SEMESTER_LABEL} Records</span>
        </div>
      </div>

      {/* 2. Decisions Audit Table */}
      <div className="border border-[#1c263c] rounded-2xl overflow-hidden bg-[#0b0f19] shadow-sm">
        <div className="p-4 bg-[#121827] border-b border-[#1c263c] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Recorded Academic Determinations ({reviewedApps.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            All approvals and revision requests are cryptographically timestamped
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121827] border-b border-[#1c263c] text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Student Scholar</th>
                <th className="py-3.5 px-3 font-semibold text-center">Decision</th>
                <th className="py-3.5 px-3 font-semibold">Determination Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Permanent Faculty Remarks</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {reviewedApps.map((app) => (
                <tr key={app.registration.id} className="hover:bg-[#121827]/70 transition-colors">
                  {/* Student */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white text-sm">{app.student.full_name}</div>
                    <div className="font-mono text-emerald-400 text-xs font-medium">{app.student.diu_id}</div>
                  </td>

                  {/* Decision */}
                  <td className="py-3.5 px-3 text-center">
                    <StatusBadge status={app.registration.status} className="text-xs" />
                  </td>

                  {/* Timestamp */}
                  <td className="py-3.5 px-3 text-xs font-mono text-slate-300">
                    {new Date(app.registration.reviewed_at || "").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  {/* Remarks */}
                  <td className="py-3.5 px-4 text-xs text-slate-300 italic max-w-md">
                    &ldquo;{app.registration.advisor_notes || "Approved without exception notes."}&rdquo;
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 border-[#1c263c] bg-[#121827] hover:bg-[#172136] text-slate-200 hover:text-white text-xs font-medium rounded-lg"
                    >
                      <Link href={`/advisor/review/${app.registration.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1 text-[#008764]" />
                        <span>View Details</span>
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}

              {reviewedApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-white text-sm">No Audited Determinations Yet</p>
                    <p className="text-slate-400 mt-1">Once you approve applications, audit logs will be permanently preserved here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
