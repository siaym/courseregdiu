"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_UNAPPLIED_STUDENTS,
  MOCK_ADVISOR_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
} from "@/lib/mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Mail,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Phone,
} from "lucide-react";

export function AdviseeRosterView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("ALL");

  // Combine advisee queue and unapplied assigned students to represent all assigned students
  const allAssigned = React.useMemo(() => {
    const list: Array<{
      id: string;
      student: typeof MOCK_ADVISEE_QUEUE[0]["student"];
      registrationId: string | null;
      status: "pending_advisor" | "approved" | "not_applied";
      cgpa: number;
      completedCredits: number;
    }> = [];

    // From queue
    MOCK_ADVISEE_QUEUE.forEach((item) => {
      list.push({
        id: item.student.id,
        student: item.student,
        registrationId: item.registration.id,
        status: item.registration.status === "approved" ? "approved" : "pending_advisor",
        cgpa: item.student.cgpa || 3.5,
        completedCredits: item.student.completed_credits || 0,
      });
    });

    // Unapplied
    MOCK_UNAPPLIED_STUDENTS.forEach((student) => {
      list.push({
        id: student.id,
        student: student,
        registrationId: null,
        status: "not_applied",
        cgpa: student.cgpa || 3.5,
        completedCredits: student.completed_credits || 0,
      });
    });

    return list;
  }, []);

  const filteredAdvisees = React.useMemo(() => {
    return allAssigned.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        a.student.full_name.toLowerCase().includes(q) ||
        (a.student.diu_id && a.student.diu_id.toLowerCase().includes(q));

      let matchesBatch = true;
      if (batchFilter !== "ALL") {
        matchesBatch = a.student.batch === batchFilter;
      }

      return matchesSearch && matchesBatch;
    });
  }, [allAssigned, searchQuery, batchFilter]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      {/* 1. Header with Faculty Identity and Active Term */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1c263c] pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-[#008764]" />
            <span>My Assigned Students</span>
          </h1>
          <p className="text-sm text-slate-300">
            Official advisee roster for Faculty Advisor <strong className="text-white">{MOCK_ADVISOR_PROFILE.full_name}</strong> • Department of Computer Science & Engineering
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121827] border border-[#1c263c] text-xs font-mono text-slate-300">
            <Calendar className="h-4 w-4 text-[#008764]" />
            <span>{ACTIVE_MOCK_SEMESTER_LABEL}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9 border-[#1c263c] bg-[#121827] text-slate-200 hover:text-white hover:bg-[#172136] text-xs gap-1.5 px-3 rounded-xl"
          >
            <Download className="h-4 w-4" />
            <span>Export Roster</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-3.5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search assigned advisees by student name or DIU ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0b0f19] border-[#1c263c] text-xs h-9 text-slate-100 placeholder:text-slate-500 rounded-xl"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full bg-[#0b0f19] border border-[#1c263c] text-xs h-9 text-slate-200 rounded-xl px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Enrolled Batches</option>
              <option value="60">Batch 60 (2022 Entry)</option>
              <option value="61">Batch 61 (2023 Entry)</option>
              <option value="59">Batch 59 (2021 Entry)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Students Table */}
      <div className="border border-[#1c263c] rounded-2xl overflow-hidden bg-[#0b0f19] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121827] border-b border-[#1c263c] text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Student Information</th>
                <th className="py-3.5 px-3 font-semibold">Academic Batch</th>
                <th className="py-3.5 px-3 font-semibold text-center">CGPA</th>
                <th className="py-3.5 px-3 font-semibold text-center">Passed Credits</th>
                <th className="py-3.5 px-3 font-semibold text-center">Registration Status</th>
                <th className="py-3.5 px-3 font-semibold">Contact Channels</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {filteredAdvisees.map((item) => (
                <tr key={item.id} className="hover:bg-[#121827]/70 transition-colors">
                  {/* Student Information */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white text-sm">{item.student.full_name}</div>
                    <div className="font-mono text-emerald-400 text-xs font-medium">{item.student.diu_id || "N/A"}</div>
                    <div className="text-slate-400 text-xs truncate max-w-[220px]">{item.student.email}</div>
                  </td>

                  {/* Batch */}
                  <td className="py-3.5 px-3">
                    <div className="font-medium text-slate-200">{item.student.batch || "60th Batch"}</div>
                    <div className="text-xs font-mono text-slate-400">{item.student.department_code || "CSE"}</div>
                  </td>

                  {/* CGPA */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    <div className="font-bold text-white text-sm">{item.cgpa.toFixed(2)}</div>
                    <div className="text-slate-500 text-[11px]">Scale 4.00</div>
                  </td>

                  {/* Completed Credits */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    <div className="font-bold text-slate-200 text-sm">{item.completedCredits} Cr</div>
                    <div className="text-slate-500 text-[11px]">Degree Credits</div>
                  </td>

                  {/* Registration Status */}
                  <td className="py-3.5 px-3 text-center">
                    {item.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Approved</span>
                      </span>
                    ) : item.status === "pending_advisor" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 border border-amber-800 text-amber-300">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300">
                        <AlertCircle className="h-3 w-3 text-amber-400" />
                        <span>Not Applied</span>
                      </span>
                    )}
                  </td>

                  {/* Contact Channels */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${item.student.email}`}
                        className="p-1.5 rounded-lg bg-[#121827] border border-[#1c263c] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                        title={`Email ${item.student.full_name}`}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                      {item.student.phone && (
                        <a
                          href={`tel:${item.student.phone}`}
                          className="p-1.5 rounded-lg bg-[#121827] border border-[#1c263c] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                          title={`Call ${item.student.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    {item.registrationId ? (
                      <Button
                        asChild
                        size="sm"
                        className="h-8 px-3.5 bg-[#008764] hover:bg-[#007053] text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        <Link href={`/advisor/review/${item.registrationId}`}>
                          <span>{item.status === "approved" ? "View Details" : "Review"}</span>
                          <Eye className="h-3.5 w-3.5 ml-1 text-white" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 px-3.5 border-[#1c263c] bg-[#121827] hover:bg-[#172136] text-slate-300 hover:text-white text-xs font-medium rounded-lg"
                      >
                        <Link href="/advisor/queue">
                          <span>Application Center</span>
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredAdvisees.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    No assigned advisees match your filter criteria.
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
