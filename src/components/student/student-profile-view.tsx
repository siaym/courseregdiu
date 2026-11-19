"use client";

import * as React from "react";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
} from "@/lib/mock/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import {
  User,
  GraduationCap,
  Mail,
  Phone,
  Building,
  ShieldCheck,
} from "lucide-react";

export function StudentProfileView() {
  const profile = MOCK_STUDENT_PROFILE;

  return (
    <div className="space-y-5 text-slate-100 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <User className="h-6 w-6 text-emerald-400" />
              Student Academic Profile
            </h1>
            <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-[10px] uppercase font-mono py-0.5 px-2">
              Onboarded Profile
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Student-submitted record subject to Registrar reconciliation • Daffodil International University
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-emerald-700/50 bg-emerald-950/40 text-emerald-300 py-1 px-3 text-xs">
            Active Student Record
          </Badge>
        </div>
      </div>

      {/* Main Student Identity Card */}
      <Card className="border-slate-800 bg-slate-900 shadow-xs overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 border-b border-slate-800" />
        <CardContent className="p-5 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
            <div className="flex items-end gap-3.5">
              <Avatar
                src={profile.avatar_url}
                fallbackText={profile.full_name}
                className="h-20 w-20 border-3 border-slate-900 shadow-md bg-slate-800 text-emerald-400 font-bold"
              />
              <div className="mb-0.5">
                <h2 className="text-lg font-bold text-white">
                  {profile.full_name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono font-semibold text-emerald-400">
                    {profile.diu_id}
                  </span>
                  <span>•</span>
                  <span>{profile.batch || "58th Batch"}</span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-600/40 text-emerald-300 bg-emerald-950/30 text-xs py-1 self-start sm:self-auto">
              Regular Enrollment
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400">Department</span>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>Computer Science & Engineering</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400">Institutional Email</span>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-mono">{profile.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400">Mobile Contact</span>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono">{profile.phone || "+8801712345678"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400">Campus</span>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Daffodil Smart City (DSC)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Degree Progression Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900 md:col-span-2 shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <GraduationCap className="h-4 w-4 text-emerald-400" />
                <span>Degree Progression (B.Sc. in CSE)</span>
              </CardTitle>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                78 / 148 Credits (52.7%)
              </span>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Total credit completion breakdown for degree requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <Progress value={78} max={148} variant="diu" size="default" />

            <div className="space-y-2.5 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-300">Core Computer Science Courses</span>
                  <span className="font-mono text-slate-400">45 / 75 Credits</span>
                </div>
                <Progress value={45} max={75} size="sm" variant="diu" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-300">Basic Science & Mathematics</span>
                  <span className="font-mono text-emerald-400 font-semibold">12 / 12 Credits (Completed)</span>
                </div>
                <Progress value={12} max={12} size="sm" variant="success" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-300">General Education & Humanities</span>
                  <span className="font-mono text-slate-400">9 / 12 Credits</span>
                </div>
                <Progress value={9} max={12} size="sm" variant="warning" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-300">Major Electives & Capstone Project</span>
                  <span className="font-mono text-slate-400">12 / 49 Credits</span>
                </div>
                <Progress value={12} max={49} size="sm" variant="default" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advisor Details */}
        <Card className="border-slate-800 bg-slate-900 shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-800">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Assigned Academic Advisor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-white">
                {MOCK_ADVISOR_PROFILE.full_name}
              </div>
              <div className="text-slate-400 text-xs">
                Associate Professor & Head, CSE
              </div>
              <div className="font-mono text-emerald-400 text-[11px]">
                {MOCK_ADVISOR_PROFILE.email}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Your advisor authorizes semester course registration slips and evaluates prerequisite readiness.
            </p>

            <Button asChild variant="outline" size="sm" className="w-full text-xs border-slate-700 text-slate-200 hover:bg-slate-800">
              <a href={`mailto:${MOCK_ADVISOR_PROFILE.email}`}>
                Send Advisor Email
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
