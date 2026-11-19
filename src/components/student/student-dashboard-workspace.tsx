"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  UserCheck,
  CreditCard,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  BookOpen,
  CalendarDays,
  AlertTriangle,
  Info,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ACTIVE_MOCK_SEMESTER_LABEL,
  ACTIVE_MOCK_REGISTRATION_WINDOW,
  MOCK_STUDENT_PROFILE,
  MOCK_ADVISOR_PROFILE,
  MOCK_STUDENT_CART_SECTIONS,
  MOCK_COURSES,
  type ExtendedSection,
} from "@/lib/mock/data";

type WorkspaceState = "draft" | "submitted" | "revisions" | "approved" | "empty";

export function StudentDashboardWorkspace() {
  // Prototype Interactive State Switcher
  const [activeState, setActiveState] = React.useState<WorkspaceState>("draft");
  const [cartSections, setCartSections] = React.useState<ExtendedSection[]>(MOCK_STUDENT_CART_SECTIONS);

  const totalCredits = React.useMemo(() => {
    return cartSections.reduce((sum, s) => sum + (s.credits || 3.0), 0);
  }, [cartSections]);

  const maxAllowedCredits = 15.0; // DIU normal load for 3.68 CGPA

  const handleRemoveCourse = (sectionId: string) => {
    setCartSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Prototype Workspace State Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Prototype Workspace State Simulator:</span>
          <span className="text-slate-400 hidden sm:inline">Preview student advising lifecycles</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveState("draft")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeState === "draft"
                ? "bg-[#008764] text-white shadow-xs font-semibold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            1. Draft Slip
          </button>
          <button
            onClick={() => setActiveState("submitted")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeState === "submitted"
                ? "bg-amber-600 text-white shadow-xs font-semibold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            2. Submitted
          </button>
          <button
            onClick={() => setActiveState("revisions")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeState === "revisions"
                ? "bg-rose-600 text-white shadow-xs font-semibold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            3. Revisions Needed
          </button>
          <button
            onClick={() => setActiveState("approved")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeState === "approved"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            4. Approved
          </button>
          <button
            onClick={() => setActiveState("empty")}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              activeState === "empty"
                ? "bg-slate-700 text-white shadow-xs font-semibold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            5. Window Closed
          </button>
        </div>
      </div>

      {/* Header Banner: Student Identity & Active Semester */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Course Advising Workspace
            </h1>
            <Badge variant="diu" className="text-[10px] uppercase font-mono py-0.5 px-2">
              Student Portal
            </Badge>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              SYNTHETIC MOCK DATA
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Welcome back, <strong className="text-slate-200">{MOCK_STUDENT_PROFILE.full_name}</strong> • Student ID:{" "}
            <span className="font-mono text-emerald-400 font-bold">{MOCK_STUDENT_PROFILE.diu_id}</span> • {MOCK_STUDENT_PROFILE.department_code} Department ({MOCK_STUDENT_PROFILE.batch})
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Active Advising Term</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {ACTIVE_MOCK_SEMESTER_LABEL}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Cumulative GPA</span>
            <span className="text-sm font-bold text-white font-mono">
              {MOCK_STUDENT_PROFILE.cgpa?.toFixed(2)} / 4.00
            </span>
          </div>
        </div>
      </div>

      {/* Primary Priority Operational Matrix (4 Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Registration Window */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Advising Schedule</span>
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-100 mt-1">
              {activeState === "empty" ? "Advising Closed" : "Active Registration Window"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1.5 text-xs">
            <p className="text-[11px] text-slate-400">
              {ACTIVE_MOCK_REGISTRATION_WINDOW}
            </p>
            <div className="flex items-center gap-1.5 text-[11px]">
              {activeState === "empty" ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Window expired for regular advising
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  4 Days Remaining to Finalize Slip
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Advising Application Status */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Advising Status</span>
              {activeState === "draft" && <FileEdit className="h-4 w-4 text-blue-400" />}
              {activeState === "submitted" && <Clock className="h-4 w-4 text-amber-400" />}
              {activeState === "revisions" && <AlertTriangle className="h-4 w-4 text-rose-400" />}
              {activeState === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {activeState === "empty" && <Info className="h-4 w-4 text-slate-500" />}
            </div>
            <CardTitle className="text-sm font-bold text-slate-100 mt-1">
              {activeState === "draft" && "Advising Slip: Draft"}
              {activeState === "submitted" && "Submitted: Under Review"}
              {activeState === "revisions" && "Revision Required"}
              {activeState === "approved" && "Registration Approved"}
              {activeState === "empty" && "No Active Application"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              {activeState === "draft" && (
                <Badge variant="outline" className="border-blue-700 bg-blue-950/60 text-blue-300 text-[10px]">
                  Unsubmitted Cart
                </Badge>
              )}
              {activeState === "submitted" && (
                <Badge variant="warning" className="text-[10px]">
                  Pending Faculty Action
                </Badge>
              )}
              {activeState === "revisions" && (
                <Badge variant="destructive" className="text-[10px]">
                  Faculty Remarks Received
                </Badge>
              )}
              {activeState === "approved" && (
                <Badge variant="success" className="text-[10px]">
                  Officially Enrolled
                </Badge>
              )}
              {activeState === "empty" && (
                <Badge variant="outline" className="text-[10px]">
                  Archived Term
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {activeState === "draft" && "Courses staged in local cart"}
              {activeState === "submitted" && "Queue position: #2 in CSE batch"}
              {activeState === "revisions" && "Review faculty comments below"}
              {activeState === "approved" && "Enrolled in 5 class sections"}
              {activeState === "empty" && "Awaiting next academic term"}
            </p>
          </CardContent>
        </Card>

        {/* 3. Assigned Academic Advisor */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Assigned Advisor</span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-100 truncate mt-1">
              {MOCK_ADVISOR_PROFILE.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1 text-xs">
            <p className="text-[11px] text-slate-400 truncate">
              {MOCK_ADVISOR_PROFILE.diu_id} • Dept. of CSE
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              Room 412, AB-04, Smart City
            </p>
            <div className="text-[10px] text-emerald-400 font-medium">
              Consultation: Sun & Tue 11:30–13:00
            </div>
          </CardContent>
        </Card>

        {/* 4. Payment Clearance Declaration */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Tuition Clearance</span>
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-100 mt-1">
              Accounts Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Minimum Dues Cleared
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Ref: DIU-AC-2026-8812
            </p>
            <p className="text-[10px] text-slate-500">
              Satisfies mandatory 30% prerequisite for registration approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Action Required Alert Banner */}
      {activeState === "draft" && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-900/60 text-blue-300 shrink-0 mt-0.5">
              <FileEdit className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Action Required: Submit Your Advising Slip
              </h4>
              <p className="text-xs text-slate-300">
                You have selected <strong className="text-white">{cartSections.length} courses ({totalCredits} Credits)</strong>. Review timetable slots for clashes, then submit your slip to Dr. Sheak Rashed Haider Noori for final approval.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs font-semibold shrink-0">
            <Link href="/registration">
              Review Cart & Submit
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {activeState === "submitted" && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-900/60 text-amber-300 shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Application Under Faculty Review
              </h4>
              <p className="text-xs text-slate-300">
                Your registration application was submitted on <strong>January 09, 2026 at 08:15 AM</strong>. Your assigned advisor is currently verifying prerequisite criteria and capacity allocations.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-700 text-amber-300 text-xs shrink-0">
            <Link href="/student/tracking">
              Track Status Stepper
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {activeState === "revisions" && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-900/60 text-rose-300 shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Revision Requested by Faculty Advisor
              </h4>
              <p className="text-xs text-slate-200">
                Advisor Remark: <em className="text-white">&ldquo;Please swap CSE225 Section A to Section B due to section capacity limits, then resubmit your slip.&rdquo;</em>
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0">
            <Link href="/registration">
              Modify Courses & Resubmit
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {activeState === "approved" && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-300 shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Registration Officially Approved & Enrolled
              </h4>
              <p className="text-xs text-slate-300">
                Dr. Sheak Rashed Haider Noori has approved your Spring 2026 course registration. Your class routine is confirmed.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs font-semibold shrink-0">
            <Link href="/schedule">
              View Final Timetable
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* Main Registration Workspace Table */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-white">
                Spring 2026 Advising Slip Course Selection
              </CardTitle>
              <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono text-[10px]">
                {cartSections.length} Courses Selected
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              Current enrolled and staged sections for the active registration term
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-slate-800 text-xs text-slate-200 bg-slate-950 hover:bg-slate-800">
              <Link href="/courses">
                <BookOpen className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Add More Courses
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs font-semibold">
              <Link href="/registration">
                Proceed to Cart
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {cartSections.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={BookOpen}
                title="Your Advising Slip is Empty"
                description="You haven't selected any courses for Spring 2026 yet. Browse the official DIU department course offerings to stage your curriculum."
                action={
                  <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs font-semibold">
                    <Link href="/courses">Explore Course Catalog</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs font-semibold py-3 px-4">Course</TableHead>
                    <TableHead className="text-slate-400 text-xs font-semibold py-3 px-4">Type</TableHead>
                    <TableHead className="text-slate-400 text-xs font-semibold py-3 px-4">Section</TableHead>
                    <TableHead className="text-slate-400 text-xs font-semibold py-3 px-4 text-center">Credits</TableHead>
                    <TableHead className="text-slate-400 text-xs font-semibold py-3 px-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartSections.map((sec) => {
                    const course = MOCK_COURSES.find((c) => c.code === sec.course_code);
                    const isRetake = course?.enrollment_type === "retake";
                    const isBacklog = course?.enrollment_type === "backlog";

                    return (
                      <TableRow key={sec.id} className="border-slate-800 hover:bg-slate-850/50">
                        <TableCell className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white font-mono">{sec.course_code}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {sec.course_title}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          {isRetake ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
                              Retake / GPA Imp.
                            </span>
                          ) : isBacklog ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80">
                              Backlog Clear
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                              Regular
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-200 font-mono text-[11px]">
                            {sec.section_name}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-xs text-center font-mono font-bold text-emerald-400">
                          {sec.credits?.toFixed(1) || "3.0"}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href="/courses"
                              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                            >
                              Swap
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemoveCourse(sec.id)}
                              className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/30 transition-colors"
                            >
                              Drop
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer Load Calculator Bar */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 w-full sm:max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Credit Load:</span>
                <span className="font-bold font-mono text-white">
                  {totalCredits.toFixed(1)} / {maxAllowedCredits.toFixed(1)} Credits
                </span>
              </div>
              <Progress
                value={(totalCredits / maxAllowedCredits) * 100}
                size="sm"
                variant="diu"
              />
              <p className="text-[10px] text-slate-500">
                DIU Policy: Standard load is 12.0–15.0 Cr for CGPA ≥ 3.50 (Max allowed: 18.0 Cr with Head Approval)
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <Button asChild size="sm" variant="outline" className="border-slate-800 text-xs text-slate-300 bg-slate-900">
                <Link href="/schedule">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  View Timetable Grid
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007052] text-white text-xs font-semibold">
                <Link href="/registration">
                  Finalize & Submit Slip
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Degree Milestones & Student Records Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Degree Completion Breakdown */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">B.Sc. in CSE Degree Progress</h3>
            </div>
            <Link href="/student/history" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
              Full Transcript &rarr;
            </Link>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Completed Credits</span>
              <span className="font-mono text-white font-bold">78.0 / 148.0 Credits (52.7%)</span>
            </div>
            <Progress value={52.7} size="sm" variant="success" />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Core CSE</span>
              <span className="font-bold text-slate-200 font-mono">48.0 / 92 Cr</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Basic Science</span>
              <span className="font-bold text-slate-200 font-mono">18.0 / 24 Cr</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">General Ed</span>
              <span className="font-bold text-slate-200 font-mono">12.0 / 32 Cr</span>
            </div>
          </div>
        </Card>

        {/* Portal Quick Navigation Links */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Advising Navigation Modules</h3>
            <span className="text-[10px] text-slate-400 font-mono">Quick Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/courses"
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-[#008764] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-slate-200 group-hover:text-white">Course Catalog</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400" />
            </Link>

            <Link
              href="/registration"
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-[#008764] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-slate-200 group-hover:text-white">Advising Cart</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400" />
            </Link>

            <Link
              href="/schedule"
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-[#008764] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-400" />
                <span className="font-medium text-slate-200 group-hover:text-white">Weekly Routine</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-purple-400" />
            </Link>

            <Link
              href="/student/tracking"
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-[#008764] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-slate-200 group-hover:text-white">Status Tracking</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400" />
            </Link>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span>Need faculty assistance?</span>
            <Link href="/student/profile" className="text-emerald-400 hover:underline font-semibold">
              Contact Student Advisor &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
