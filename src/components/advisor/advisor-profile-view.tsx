"use client";

import * as React from "react";
import { MOCK_ADVISOR_PROFILE, ACTIVE_MOCK_SEMESTER_LABEL } from "@/lib/mock/data";
import { Avatar } from "@/components/ui/avatar";
import {
  User,
  Building,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export function AdvisorProfileView() {
  const profile = MOCK_ADVISOR_PROFILE;

  return (
    <div className="space-y-6 text-slate-100 max-w-4xl mx-auto py-2">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1c263c] pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <User className="h-7 w-7 text-[#008764]" />
            <span>Faculty Advisor Profile</span>
          </h1>
          <p className="text-sm text-slate-300">
            Authorized academic faculty credentials and official advising commission
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold self-start sm:self-center">
          <CheckCircle2 className="h-4 w-4" />
          <span>Active Advising Commission</span>
        </div>
      </div>

      {/* 2. Main Faculty Identity Card */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-[#1c263c] pb-6">
          <Avatar
            src={profile.avatar_url}
            fallbackText={profile.full_name}
            className="h-20 w-20 rounded-2xl border-2 border-emerald-500/40 shadow-sm shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {profile.full_name}
              </h2>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300">
                Associate Professor
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Faculty Employee ID: <strong className="text-emerald-400 font-bold">{profile.diu_id}</strong>
            </div>
            <div className="text-xs text-slate-300">
              Department of Computer Science & Engineering • Daffodil International University
            </div>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Department */}
          <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-1.5">
            <span className="text-slate-400 font-medium">Departmental Affiliation</span>
            <div className="font-semibold text-white flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-[#008764]" />
              <span>Computer Science & Engineering</span>
            </div>
          </div>

          {/* Email */}
          <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-1.5">
            <span className="text-slate-400 font-medium">Institutional Faculty Email</span>
            <div className="font-mono font-semibold text-slate-200 flex items-center gap-2 text-xs truncate">
              <Mail className="h-4 w-4 text-[#008764] shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
          </div>

          {/* Office Room */}
          <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-1.5">
            <span className="text-slate-400 font-medium">Faculty Office Location</span>
            <div className="font-semibold text-white flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-[#008764]" />
              <span>Room AB4-508, Daffodil Smart City (DSC)</span>
            </div>
          </div>

          {/* Consultation Hours */}
          <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-1.5">
            <span className="text-slate-400 font-medium">Student Advising Hours</span>
            <div className="font-semibold text-white flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-[#008764]" />
              <span>Sunday & Tuesday (11:30 AM – 1:00 PM)</span>
            </div>
          </div>
        </div>

        {/* Current Term Advising Information */}
        <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-white font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#008764]" />
              <span>Active Advising Term: {ACTIVE_MOCK_SEMESTER_LABEL}</span>
            </div>
            <p className="text-slate-400">
              Authorized to audit and approve undergraduate course registration applications for assigned CSE batches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
