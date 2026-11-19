"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
} from "@/lib/mock/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  FileCheck2,
} from "lucide-react";

export function AdvisorQueueView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [riskFilter, setRiskFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState<"TIME" | "CGPA_ASC" | "CGPA_DESC">("TIME");

  const queue = MOCK_ADVISEE_QUEUE;

  // Filter and sort
  const filteredQueue = React.useMemo(() => {
    return queue
      .filter((app) => {
        // Search
        const matchesSearch =
          app.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (app.student.diu_id && app.student.diu_id.toLowerCase().includes(searchQuery.toLowerCase()));

        // Status
        const matchesStatus =
          statusFilter === "ALL" || app.registration.status === statusFilter;

        // Risk flag
        let matchesRisk = true;
        if (riskFilter === "PROBATION") matchesRisk = Boolean(app.isProbation);
        if (riskFilter === "CONFLICT") matchesRisk = Boolean(app.hasScheduleConflict);
        if (riskFilter === "PREREQ") matchesRisk = Boolean(app.hasPrerequisiteConflict);

        return matchesSearch && matchesStatus && matchesRisk;
      })
      .sort((a, b) => {
        if (sortBy === "CGPA_ASC") return (a.student.cgpa || 0) - (b.student.cgpa || 0);
        if (sortBy === "CGPA_DESC") return (b.student.cgpa || 0) - (a.student.cgpa || 0);
        // Default TIME (newest first)
        return (
          new Date(b.registration.submitted_at || "").getTime() -
          new Date(a.registration.submitted_at || "").getTime()
        );
      });
  }, [queue, searchQuery, statusFilter, riskFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="h-7 w-7 text-[#006a4e]" />
            <span>Advisee Application Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Search, filter, and review submitted course registration slips for assigned DIU scholars.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono py-1 px-3">
            Spring 2026 Advising Cycle
          </Badge>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <Card className="border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search Student ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs"
          >
            <option value="ALL">All Application States</option>
            <option value="pending_advisor">Pending Review Only</option>
            <option value="approved">Approved</option>
            <option value="rejected">Revision Requested</option>
          </Select>

          {/* Risk Flag Filter */}
          <Select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="PROBATION">Probation Only (CGPA &lt; 2.00)</option>
            <option value="PREREQ">Prerequisite Deficiencies</option>
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "TIME" | "CGPA_ASC" | "CGPA_DESC")}
            className="text-xs"
          >
            <option value="TIME">Sort: Newest Submissions First</option>
            <option value="CGPA_ASC">Sort: Lowest CGPA (High Risk)</option>
            <option value="CGPA_DESC">Sort: Highest CGPA</option>
          </Select>
        </div>
      </Card>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing <strong>{filteredQueue.length}</strong> advisee applications</span>
        <span>Spring 2026 Roster</span>
      </div>

      {/* Desktop Table View */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Student ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead className="w-24 text-center">CGPA</TableHead>
                <TableHead className="w-28 text-center">Credits</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead className="w-32">Risk Flags</TableHead>
                <TableHead className="w-28 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    No advisee applications match the specified criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQueue.map((app) => (
                  <TableRow key={app.registration.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <TableCell className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                      {app.student.diu_id}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        {app.student.full_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {app.student.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-xs">
                      <span className={app.student.cgpa && app.student.cgpa < 2.0 ? "text-rose-600 font-bold" : "text-slate-700 dark:text-slate-300"}>
                        {app.student.cgpa?.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-slate-700 dark:text-slate-300">
                      <strong>{app.totalCredits} Cr</strong> ({app.totalCourses})
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={app.registration.status} className="text-[10px]" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!app.registration.payment_cleared && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                            Tuition Hold
                          </Badge>
                        )}
                        {app.isProbation && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                            Probation
                          </Badge>
                        )}
                        {app.hasPrerequisiteConflict && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                            Missing Prereq
                          </Badge>
                        )}
                        {app.registration.payment_cleared && !app.isProbation && !app.hasPrerequisiteConflict && (
                          <span className="text-[11px] text-emerald-400 font-semibold">Ready</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs h-8 font-semibold">
                        <Link href={`/advisor/review/${app.registration.id}`}>
                          Review
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Card List */}
      <div className="space-y-3 md:hidden">
        {filteredQueue.map((app) => (
          <Card key={app.registration.id} className="border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {app.student.full_name}
                </span>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">
                  ID: {app.student.diu_id}
                </div>
              </div>
              <StatusBadge status={app.registration.status} className="text-[10px]" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
              <div>
                <span className="text-muted-foreground block text-[10px]">CGPA:</span>
                <strong className={app.student.cgpa && app.student.cgpa < 2.0 ? "text-rose-600 font-bold" : ""}>
                  {app.student.cgpa?.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Requested Load:</span>
                <strong>{app.totalCredits} Credits</strong>
              </div>
            </div>

            {app.isProbation && (
              <Badge variant="destructive" className="text-[10px]">
                Academic Probation Alert (CGPA &lt; 2.00)
              </Badge>
            )}

            <Button asChild size="sm" className="w-full bg-[#006a4e] text-white text-xs">
              <Link href={`/advisor/review/${app.registration.id}`}>
                Review Application
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
