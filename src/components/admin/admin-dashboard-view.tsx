"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  UserCheck,
  GitBranch,
  AlertTriangle,
  FileCheck2,
  FileClock,
  FileX2,
  ShieldCheck,
  FileSpreadsheet,
  ScrollText,
  ArrowRight,
  DatabaseZap,
} from "lucide-react";
import { AdminAuthSettingsCard } from "@/components/admin/admin-auth-settings-card";
import type { AdminOverviewData } from "@/lib/admin/admin-service";

interface AdminDashboardViewProps {
  overview: AdminOverviewData;
  systemSettings?: {
    emailAuthEnabled: boolean;
    demoBypassEnabled: boolean;
  };
}

function formatStat(val: number | null): string {
  return val === null ? "Unavailable" : val.toLocaleString();
}

function formatSemLabel(sem: { name?: string | null; season: string; year: number }): string {
  if (sem.name) return sem.name;
  return `${sem.season.charAt(0).toUpperCase() + sem.season.slice(1)} ${sem.year}`;
}

export function AdminDashboardView({ overview, systemSettings }: AdminDashboardViewProps) {
  const router = useRouter();
  const { metrics, semesters, selectedSemester, activeSemester } = overview;

  const handleSemesterChange = (semesterId: string) => {
    router.push(`/admin?semester=${encodeURIComponent(semesterId)}`);
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header & Semester Filter */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#062822] border border-[#064e3b] text-[#10b981]">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              University Administration Overview
            </h1>
            {activeSemester ? (
              <span className="text-xs font-mono font-medium text-[#10b981] px-2.5 py-0.5 rounded-full bg-[#062822] border border-[#064e3b]">
                Active: {formatSemLabel(activeSemester)}
              </span>
            ) : (
              <span className="text-xs font-mono font-medium text-amber-300 px-2.5 py-0.5 rounded-full bg-[#2b200b] border border-[#78350f]">
                No Active Semester
              </span>
            )}
          </div>
          <p className="text-xs text-[#8e9db2]">
            Live operational telemetry from PostgreSQL for advisor rosters, student assignments, registrations, and payment clearance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="admin-semester-filter" className="text-xs font-medium text-[#8e9db2]">
            Semester Scope
          </label>
          <select
            id="admin-semester-filter"
            value={selectedSemester?.id || ""}
            onChange={(e) => handleSemesterChange(e.target.value)}
            disabled={semesters.length === 0}
            className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {semesters.length === 0 ? (
              <option value="">No semesters available</option>
            ) : (
              semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatSemLabel(s)} {s.is_active ? "(Active)" : s.is_archived ? "(Archived)" : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Unavailable State Banner */}
      {!overview.available && (
        <div
          role="alert"
          className="rounded-xl border border-[#881337] bg-[#2e1014] p-4 flex items-start gap-3 text-xs text-rose-200"
        >
          <DatabaseZap className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Database Telemetry Unavailable</p>
            <p className="text-rose-200/90">
              {overview.errorMessage || "Unable to connect to Supabase. No synthetic fallback metrics are displayed."}
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          href="/admin/batches"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-600 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Registered Students</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {formatStat(metrics.totalStudents)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
            <span>View batches</span>
            <ArrowRight className="h-3.5 w-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/advisors"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-600 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Active Advisors</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {formatStat(metrics.totalActiveAdvisors)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
            <span>Advisor directory</span>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/assignments"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-600 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Advisor Assignments</span>
            <GitBranch className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {formatStat(metrics.totalAssignments)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
            <span>Manage assignments</span>
            <ArrowRight className="h-3.5 w-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/assignments?filter=unassigned"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-600 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Unassigned Students</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
            {formatStat(metrics.unassignedStudents)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
            <span>Assign advisors</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/assignments?filter=conflicts"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-600 transition-colors group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Conflicting Assignments</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-mono">
            {formatStat(metrics.conflictingAssignments)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400 flex items-center justify-between">
            <span>Resolve conflicts</span>
            <ArrowRight className="h-3.5 w-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Applications & Payment Clearance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Registration Applications</h2>
            <Link href="/advisor/queue" className="text-xs text-sky-400 hover:underline">
              Advisor Queue &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#78350f] bg-[#2b200b] p-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                <FileClock className="h-3.5 w-3.5" />
                <span>Pending</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {formatStat(metrics.pendingApplications)}
              </div>
            </div>
            <div className="rounded-lg border border-[#064e3b] bg-[#062822] p-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Approved</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {formatStat(metrics.approvedApplications)}
              </div>
            </div>
            <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3">
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-medium">
                <FileX2 className="h-3.5 w-3.5" />
                <span>Returned</span>
              </div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {formatStat(metrics.rejectedApplications)}
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/admin/payments"
          className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-4 hover:border-slate-600 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Payment Clearance Breakdown</h2>
            </div>
            <span className="text-xs text-emerald-400">Manage Clearances &rarr;</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#064e3b] bg-[#062822] p-3">
              <div className="text-xs text-emerald-300 font-medium">Cleared</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {metrics.paymentBreakdown ? metrics.paymentBreakdown.cleared : "Unavailable"}
              </div>
            </div>
            <div className="rounded-lg border border-[#78350f] bg-[#2b200b] p-3">
              <div className="text-xs text-amber-300 font-medium">Awaiting</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {metrics.paymentBreakdown ? metrics.paymentBreakdown.awaiting : "Unavailable"}
              </div>
            </div>
            <div className="rounded-lg border border-[#881337] bg-[#2e1014] p-3">
              <div className="text-xs text-rose-300 font-medium">Not Cleared</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-white">
                {metrics.paymentBreakdown ? metrics.paymentBreakdown.notCleared : "Unavailable"}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Roster Imports & Recent Audit Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-sky-400" />
              <h2 className="text-base font-bold text-white">Recent Roster Imports</h2>
            </div>
            <Link href="/admin/import" className="text-xs text-sky-400 hover:underline">
              Import Roster &rarr;
            </Link>
          </div>
          {overview.recentImports.length === 0 ? (
            <p className="text-xs text-[#8e9db2] py-4 border-t border-[#1c263c]">
              No advisor roster imports recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#1c263c] border-t border-[#1c263c]">
              {overview.recentImports.map((imp) => (
                <div key={imp.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{imp.file_name}</p>
                    <p className="text-slate-400 font-mono">
                      Sheet: {imp.worksheet_name} • Mode: {imp.assignment_mode}
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-[#1c263c] bg-[#0b0f19] px-2 py-0.5 font-mono text-slate-300">
                    {imp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1c263c] bg-[#121827] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">Recent Administrative Actions</h2>
            </div>
            <Link href="/admin/audit" className="text-xs text-amber-400 hover:underline">
              All Audit Logs &rarr;
            </Link>
          </div>
          {overview.recentAuditLogs.length === 0 ? (
            <p className="text-xs text-[#8e9db2] py-4 border-t border-[#1c263c]">
              No administrative audit events recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#1c263c] border-t border-[#1c263c]">
              {overview.recentAuditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-white truncate">{log.action}</p>
                    <p className="text-slate-400 truncate">
                      {log.entity_type} {log.entity_id ? `• ${log.entity_id}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-400 font-mono">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Auth & System Controls */}
      <AdminAuthSettingsCard
        initialEmailAuthEnabled={systemSettings?.emailAuthEnabled ?? true}
        initialDemoBypassEnabled={systemSettings?.demoBypassEnabled ?? true}
      />
    </div>
  );
}
