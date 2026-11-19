"use client";

import * as React from "react";
import { MOCK_ADVISOR_PROFILE } from "@/lib/mock/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  User,
  Building,
  Mail,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";

export function AdvisorProfileView() {
  const profile = MOCK_ADVISOR_PROFILE;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-7 w-7 text-[#006a4e]" />
            <span>Faculty Academic Advisor Profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Department of Computer Science & Engineering • Daffodil International University
          </p>
        </div>

        <Badge variant="diu" className="text-xs py-1 px-3">
          Authorized Faculty Advisor
        </Badge>
      </div>

      {/* Main Faculty Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#006a4e] via-[#02805f] to-[#049670]" />
        <CardContent className="p-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <Avatar
                src={profile.avatar_url}
                fallbackText={profile.full_name}
                className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-md"
              />
              <div className="mb-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {profile.full_name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    ID: {profile.diu_id}
                  </span>
                  <span>•</span>
                  <span>Associate Professor</span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-500/40 text-[#006a4e] bg-emerald-50 dark:bg-emerald-950/40 text-xs py-1">
              Active Advising Commission
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Department</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>Computer Science & Engineering</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Faculty Email</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Office Room</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Room AB4-508, DSC Campus</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground">Consultation Schedule</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Sun & Tue (11:30 - 01:00)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advising Responsibilities & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Assigned Cohort</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#006a4e]" />
            <span>48 Advisees</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Batch 58, 59 & 60 Students</div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Advising Jurisdiction</div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            Level 2 & Level 3
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Undergraduate B.Sc. in CSE</div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Advising Season</div>
          <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            Spring 2026 Active
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Window: Jan 05 – Jan 25, 2026</div>
        </Card>
      </div>
    </div>
  );
}
