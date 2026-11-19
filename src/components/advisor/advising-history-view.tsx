"use client";

import * as React from "react";
import Link from "next/link";
import {
  MOCK_ADVISEE_QUEUE,
  MOCK_ADVISOR_PROFILE,
} from "@/lib/mock/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  History,
  ArrowRight,
} from "lucide-react";

export function AdvisingHistoryView() {
  const reviewedApps = MOCK_ADVISEE_QUEUE.filter((a) => a.registration.reviewed_at !== null);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-7 w-7 text-[#006a4e]" />
            <span>Advising Decision History & Audit Log</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Permanent institutional record of advising determinations made by <strong>{MOCK_ADVISOR_PROFILE.full_name}</strong>
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-mono py-1 px-3">
          Spring 2026 Term Records
        </Badge>
      </div>

      {/* Decisions Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Recorded Academic Determinations ({reviewedApps.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Every signed approval or revision request is timestamped and auditable.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Student ID</TableHead>
                <TableHead className="w-48">Student Name</TableHead>
                <TableHead className="w-32 text-center">Decision</TableHead>
                <TableHead className="w-36">Reviewed At</TableHead>
                <TableHead>Permanent Faculty Remarks</TableHead>
                <TableHead className="w-20 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewedApps.map((app) => (
                <TableRow key={app.registration.id}>
                  <TableCell className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                    {app.student.diu_id}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-slate-900 dark:text-white">
                    {app.student.full_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={app.registration.status} className="text-[10px]" />
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {new Date(app.registration.reviewed_at || "").toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{app.registration.advisor_notes || "Approved without notes."}&rdquo;
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost" className="text-xs h-8 px-2">
                      <Link href={`/advisor/review/${app.registration.id}`}>
                        <ArrowRight className="h-4 w-4" />
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
