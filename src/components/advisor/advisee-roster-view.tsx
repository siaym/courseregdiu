"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_ADVISOR_PROFILE,
} from "@/lib/mock/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  Search,
  Mail,
  Download,
} from "lucide-react";

export function AdviseeRosterView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("ALL");

  const advisees = MOCK_ADVISEE_QUEUE;

  const filteredAdvisees = React.useMemo(() => {
    return advisees.filter((a) => {
      const matchesSearch =
        a.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.student.diu_id && a.student.diu_id.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesBatch = true;
      if (batchFilter === "60") matchesBatch = a.student.diu_id?.startsWith("221") ?? false;
      if (batchFilter === "59") matchesBatch = a.student.diu_id?.startsWith("213") ?? false;
      if (batchFilter === "61") matchesBatch = a.student.diu_id?.startsWith("223") ?? false;

      return matchesSearch && matchesBatch;
    });
  }, [advisees, searchQuery, batchFilter]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-[#006a4e]" />
            <span>Assigned Advisee Roster</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Department of Computer Science & Engineering • Faculty Advisor: <strong>{MOCK_ADVISOR_PROFILE.full_name}</strong>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs">
          <Download className="h-3.5 w-3.5 mr-1" />
          Export Roster (CSV)
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by student name or DIU ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <Select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="text-xs"
          >
            <option value="ALL">All Enrolled Batches</option>
            <option value="60">Batch 60 (2022 Entry)</option>
            <option value="59">Batch 59 (2021 Entry)</option>
            <option value="61">Batch 61 (2023 Entry)</option>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Student ID</TableHead>
                <TableHead>Student Scholar</TableHead>
                <TableHead className="w-24 text-center">CGPA</TableHead>
                <TableHead className="w-24 text-center">Credits</TableHead>
                <TableHead className="w-32 text-center">Spring 2026 State</TableHead>
                <TableHead>Contact Information</TableHead>
                <TableHead className="w-24 text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdvisees.map((adv) => (
                <TableRow key={adv.student.id}>
                  <TableCell className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {adv.student.diu_id}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {adv.student.full_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      B.Sc. in CSE • Regular
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    <span className={adv.student.cgpa && adv.student.cgpa < 2.0 ? "text-rose-600 font-bold" : "font-bold text-slate-800 dark:text-slate-200"}>
                      {adv.student.cgpa?.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {adv.student.completed_credits} Cr
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={adv.registration.status} className="text-[10px]" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{adv.student.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="text-xs h-8">
                      <Link href={`/advisor/review/${adv.registration.id}`}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
