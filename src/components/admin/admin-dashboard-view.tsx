"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Layers,
  Mail,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ACTIVE_MOCK_SEMESTER_LABEL } from "@/lib/mock/data";
import { AdminAuthSettingsCard } from "@/components/admin/admin-auth-settings-card";

interface AdminDashboardViewProps {
  stats: {
    totalConfiguredBatches: number;
    totalAssignedCourses: number;
    paymentClearanceCount: {
      cleared: number;
      awaiting: number;
      notCleared: number;
    };
    authorizedAlternativeEmails: number;
  };
  systemSettings?: {
    emailAuthEnabled: boolean;
    demoBypassEnabled: boolean;
  };
}

export function AdminDashboardView({ stats, systemSettings }: AdminDashboardViewProps) {
  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Header */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-400">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              University Administration Portal
            </h1>
            <span className="text-xs font-mono font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80">
              {ACTIVE_MOCK_SEMESTER_LABEL}
            </span>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Daffodil International University • Operational administration for batch curriculums, tuition payment clearance, and institutional email authorizations.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Configured Batches */}
        <Link
          href="/admin/curriculum"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-700 transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Batch Curriculums</span>
            <Layers className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {stats.totalConfiguredBatches} Batches
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats.totalAssignedCourses} Course Offerings</span>
            <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </Link>

        {/* Metric 2: Tuition Cleared */}
        <Link
          href="/admin/payments"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-700 transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Tuition Payments Cleared</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {stats.paymentClearanceCount.cleared} Students
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Verified by Accounts</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </Link>

        {/* Metric 3: Pending Payments */}
        <Link
          href="/admin/payments"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-700 transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Payments Awaiting / Hold</span>
            <Clock className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
            {stats.paymentClearanceCount.awaiting + stats.paymentClearanceCount.notCleared}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats.paymentClearanceCount.awaiting} Awaiting • {stats.paymentClearanceCount.notCleared} Hold</span>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </Link>

        {/* Metric 4: Authorized Emails */}
        <Link
          href="/admin/emails"
          className="p-4 rounded-xl bg-[#121827] border border-[#1c263c] hover:border-slate-700 transition-all group block shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e9db2] font-medium">Authorized Emails</span>
            <Mail className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400 font-mono">
            {stats.authorizedAlternativeEmails} Accounts
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Multi-Email Identity Registry</span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Authentication & Sign-In Controls (Email Auth Toggle & Demo Mode) */}
      <AdminAuthSettingsCard
        initialEmailAuthEnabled={systemSettings?.emailAuthEnabled ?? true}
        initialDemoBypassEnabled={systemSettings?.demoBypassEnabled ?? true}
      />

      {/* Core Operational Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Batch Course Configuration */}
        <div className="p-5 rounded-2xl bg-[#121827] border border-[#1c263c] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white">
              Batch & Semester Course Offerings
            </h2>
            <p className="text-xs text-[#8e9db2] leading-relaxed">
              Define the fixed courses available for each batch in active and upcoming terms.
              Students only see courses designated for their cohort.
            </p>
          </div>
          <Link
            href="/admin/curriculum"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#172136] hover:bg-[#1a233a] border border-[#25324d] text-xs font-semibold text-slate-200 hover:text-white transition-all"
          >
            <span>Open Configuration Studio</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>

        {/* Module 2: Tuition Payment Clearance */}
        <div className="p-5 rounded-2xl bg-[#121827] border border-[#1c263c] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white">
              Tuition Accounts Clearance Center
            </h2>
            <p className="text-xs text-[#8e9db2] leading-relaxed">
              Verify student tuition payments, mark clearance statuses, manage accounts holds,
              and inspect the immutable audit log.
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#172136] hover:bg-[#1a233a] border border-[#25324d] text-xs font-semibold text-slate-200 hover:text-white transition-all"
          >
            <span>Manage Payment Clearances</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>

        {/* Module 3: Email Identity Authorizations */}
        <div className="p-5 rounded-2xl bg-[#121827] border border-[#1c263c] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white">
              Multi-Email Identity Management
            </h2>
            <p className="text-xs text-[#8e9db2] leading-relaxed">
              Authorize alternative personal Gmail accounts for students or advisors, enforce DIU domain policies,
              and inspect authorization audit trails.
            </p>
          </div>
          <Link
            href="/admin/emails"
            className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#172136] hover:bg-[#1a233a] border border-[#25324d] text-xs font-semibold text-slate-200 hover:text-white transition-all"
          >
            <span>Manage Authorized Emails</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
