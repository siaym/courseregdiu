"use client";

import * as React from "react";
import {
  MOCK_STUDENT_PROFILE,
  MOCK_STUDENT_COMPLETED_COURSES,
} from "@/lib/mock/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  History,
  Download,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export function AcademicHistoryView() {
  const completedCourses = MOCK_STUDENT_COMPLETED_COURSES;
  const totalCompletedCredits = completedCourses.reduce((sum, c) => sum + c.credits, 0);

  // Group by semester
  const semesters = React.useMemo(() => {
    const map: Record<string, typeof completedCourses> = {};
    completedCourses.forEach((c) => {
      if (!map[c.semesterName]) map[c.semesterName] = [];
      map[c.semesterName].push(c);
    });
    return map;
  }, [completedCourses]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-7 w-7 text-[#006a4e]" />
            <span>Academic History & Transcript</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete academic coursework transcript record for Student ID: <code className="font-mono text-slate-800 dark:text-slate-200">{MOCK_STUDENT_PROFILE.diu_id}</code>
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs">
          <Download className="h-3.5 w-3.5 mr-1" />
          Export Transcript (PDF)
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Cumulative GPA</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {MOCK_STUDENT_PROFILE.cgpa?.toFixed(2)} / 4.00
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Official DIU Grading Scale</div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Credits Completed</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalCompletedCredits.toFixed(1)} Credits
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Degree Requirement: ~148 Cr</div>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-muted-foreground mb-1">Academic Status</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 dark:text-white">Regular Scholar</span>
            <Badge variant="success" className="text-[10px]">Active</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Department of CSE (Batch 60)</div>
        </Card>
      </div>

      {/* Semester Course History Breakdown */}
      <div className="space-y-5">
        {Object.entries(semesters).map(([semesterName, courses]) => {
          const semCredits = courses.reduce((sum, c) => sum + c.credits, 0);
          const semGpa = (
            courses.reduce((sum, c) => sum + c.gradePoint * c.credits, 0) / semCredits
          ).toFixed(2);

          return (
            <Card key={semesterName} className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#006a4e]" />
                    <CardTitle className="text-sm font-semibold">{semesterName}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Credits: <strong className="font-mono text-slate-800 dark:text-slate-200">{semCredits} Cr</strong></span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Term GPA: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{semGpa}</strong></span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Code</TableHead>
                      <TableHead>Course Title</TableHead>
                      <TableHead className="w-20 text-center">Credits</TableHead>
                      <TableHead className="w-24 text-center">Grade</TableHead>
                      <TableHead className="w-24 text-center">Point</TableHead>
                      <TableHead className="w-24 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((c) => (
                      <TableRow key={c.code}>
                        <TableCell className="font-mono font-bold text-[#006a4e] text-xs">
                          {c.code}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {c.title}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono">
                          {c.credits.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                          {c.grade}
                        </TableCell>
                        <TableCell className="text-xs text-center font-mono text-muted-foreground">
                          {c.gradePoint.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Passed
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
