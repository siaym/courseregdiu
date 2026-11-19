"use client";

import * as React from "react";
import {
  MOCK_COURSES,
  MOCK_SECTIONS,
  MOCK_DEPARTMENTS,
  MOCK_COMPLETED_COURSE_CODES,
  MOCK_STUDENT_CART_SECTIONS,
  type ExtendedCourse,
  type ExtendedSection,
} from "@/lib/mock/data";
import {
  getPrerequisiteStatus,
  getSectionAvailability,
  checkScheduleConflict,
  formatScheduleSlot,
} from "@/lib/mock/helpers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  BookOpen,
  CheckCircle2,
  Lock,
  User,
  AlertTriangle,
  Clock,
} from "lucide-react";

export function CourseCatalogView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");
  const [selectedLevel, setSelectedLevel] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");
  const [selectedEnrollmentType, setSelectedEnrollmentType] = React.useState<"ALL" | "REGULAR" | "RETAKE">("ALL");

  // Cart state managed locally in prototype
  const [cart, setCart] = React.useState<ExtendedSection[]>(MOCK_STUDENT_CART_SECTIONS);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);

  // Active course selected for detail modal
  const [activeCourse, setActiveCourse] = React.useState<ExtendedCourse | null>(null);

  // Filter courses
  const filteredCourses = React.useMemo(() => {
    return MOCK_COURSES.filter((course) => {
      // Search
      const matchesSearch =
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Department
      const matchesDept = selectedDept === "ALL" || course.department_code === selectedDept;

      // Level
      const matchesLevel = selectedLevel === "ALL" || course.level?.toString() === selectedLevel;

      // Prerequisite status
      const isCompleted = MOCK_COMPLETED_COURSE_CODES.includes(course.code);
      const { isEligible } = getPrerequisiteStatus(course.prerequisite_codes, MOCK_COMPLETED_COURSE_CODES);

      let matchesStatus = true;
      if (selectedStatus === "ELIGIBLE") matchesStatus = isEligible && !isCompleted;
      if (selectedStatus === "COMPLETED") matchesStatus = isCompleted;
      if (selectedStatus === "LOCKED") matchesStatus = !isEligible && !isCompleted;

      // Enrollment Type (Regular vs Retake/Backlog)
      let matchesEnrollmentType = true;
      if (selectedEnrollmentType === "REGULAR") {
        matchesEnrollmentType = !isCompleted;
      } else if (selectedEnrollmentType === "RETAKE") {
        matchesEnrollmentType = isCompleted || course.enrollment_type === "retake" || course.enrollment_type === "backlog";
      }

      return matchesSearch && matchesDept && matchesLevel && matchesStatus && matchesEnrollmentType;
    });
  }, [searchQuery, selectedDept, selectedLevel, selectedStatus, selectedEnrollmentType]);

  // Sections for modal course
  const activeCourseSections = React.useMemo(() => {
    if (!activeCourse) return [];
    return MOCK_SECTIONS.filter((s) => s.course_id === activeCourse.id);
  }, [activeCourse]);

  // Handle adding section to cart
  const handleAddToCart = (section: ExtendedSection) => {
    // Check if course already in cart
    const isAlreadyEnrolled = cart.some((s) => s.course_id === section.course_id);
    if (isAlreadyEnrolled) {
      setToastMessage({
        text: `You already have a section selected for ${section.course_code}. Remove it first to switch sections.`,
        type: "warning",
      });
      return;
    }

    // Check schedule conflict
    const conflict = checkScheduleConflict(section.schedule, cart);
    if (conflict.hasConflict && conflict.conflictingDetails) {
      setToastMessage({
        text: `Time conflict detected with ${conflict.conflictingDetails.conflictingCourseCode} (${conflict.conflictingDetails.day} ${conflict.conflictingDetails.time}).`,
        type: "warning",
      });
      return;
    }

    setCart((prev) => [...prev, section]);
    setToastMessage({
      text: `Successfully added ${section.course_code} (Section ${section.section_name}) to your registration cart!`,
      type: "success",
    });
    setActiveCourse(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-[#006a4e]" />
            <span>DIU Course Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse Department of Computer Science & Engineering course offerings, evaluate prerequisite readiness, and enroll in open sections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
            Cart: {cart.length} Courses Selected ({cart.reduce((sum, s) => sum + (s.credits || 0), 0)} Cr)
          </div>
        </div>
      </div>

      {/* Floating feedback alert */}
      {toastMessage && (
        <Alert
          variant={toastMessage.type === "success" ? "success" : "warning"}
          className="relative animate-in fade-in"
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle className="font-semibold">
            {toastMessage.type === "success" ? "Registration Updated" : "Schedule Notice"}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {toastMessage.text}
          </AlertDescription>
          <button
            onClick={() => setToastMessage(null)}
            className="absolute right-3 top-3 text-xs underline font-medium hover:opacity-80"
          >
            Dismiss
          </button>
        </Alert>
      )}

      {/* Filter Controls Bar */}
      <Card className="border-slate-800 bg-slate-900/90 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search code or title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-slate-950 border-slate-800 text-slate-100"
            />
          </div>

          {/* Department Filter */}
          <Select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-slate-950 border-slate-800 text-slate-100"
          >
            <option value="ALL">All Departments</option>
            {MOCK_DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </Select>

          {/* Academic Level */}
          <Select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="text-xs bg-slate-950 border-slate-800 text-slate-100"
          >
            <option value="ALL">All Course Levels</option>
            <option value="1">Level 1 (Freshman / Year 1)</option>
            <option value="2">Level 2 (Sophomore / Year 2)</option>
            <option value="3">Level 3 (Junior / Year 3)</option>
            <option value="4">Level 4 (Senior / Year 4)</option>
          </Select>

          {/* Eligibility Filter */}
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-950 border-slate-800 text-slate-100"
          >
            <option value="ALL">All Prerequisite Statuses</option>
            <option value="ELIGIBLE">Eligible (Prereqs Met)</option>
            <option value="COMPLETED">Already Passed</option>
            <option value="LOCKED">Prerequisites Missing</option>
          </Select>

          {/* Enrollment Type: Regular vs Retake / Backlog */}
          <Select
            value={selectedEnrollmentType}
            onChange={(e) => setSelectedEnrollmentType(e.target.value as "ALL" | "REGULAR" | "RETAKE")}
            className="text-xs bg-slate-950 border-slate-800 text-slate-100 font-medium"
          >
            <option value="ALL">All Offerings (Regular & Retake)</option>
            <option value="REGULAR">Regular Curriculum Courses</option>
            <option value="RETAKE">Optional Retake / Backlog</option>
          </Select>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing <strong>{filteredCourses.length}</strong> courses available for advising</span>
        <span>Student ID: <code className="font-mono text-slate-800 dark:text-slate-200">221-15-12345</code></span>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => {
          const isCompleted = MOCK_COMPLETED_COURSE_CODES.includes(course.code);
          const { isEligible, missingCodes } = getPrerequisiteStatus(
            course.prerequisite_codes,
            MOCK_COMPLETED_COURSE_CODES
          );
          const isInCart = cart.some((s) => s.course_id === course.id);

          return (
            <Card
              key={course.id}
              className={`flex flex-col justify-between border-slate-800 bg-slate-900/90 text-slate-100 hover:border-slate-700 transition-all ${
                isInCart ? "ring-2 ring-emerald-500 bg-emerald-950/30" : ""
              }`}
            >
              <CardHeader className="p-5 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-base text-emerald-400">
                      {course.code}
                    </span>
                    <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 text-[10px] font-mono py-0">
                      {course.credits.toFixed(1)} Cr
                    </Badge>
                  </div>

                  {isCompleted ? (
                    <Badge variant="outline" className="border-amber-800 bg-amber-950/60 text-amber-300 text-[10px]">
                      Passed (Retake Eligible)
                    </Badge>
                  ) : isEligible ? (
                    <Badge variant="diu" className="text-[10px]">
                      Eligible
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 text-white">
                  {course.title}
                </CardTitle>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{course.category || "Core"} • Level {course.level || 1}</span>
                  {course.enrollment_type === "retake" && (
                    <span className="text-[10px] text-amber-400 font-semibold">Optional Retake</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 pb-3 text-xs space-y-2">
                {/* Prerequisites breakdown */}
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Prerequisites:
                  </span>
                  {course.prerequisite_codes.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">None (Direct Enrollment)</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {course.prerequisite_codes.map((prereq) => {
                        const passed = MOCK_COMPLETED_COURSE_CODES.includes(prereq);
                        return (
                          <span
                            key={prereq}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              passed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold"
                            }`}
                          >
                            {passed ? "✓ " : "✗ "}
                            {prereq}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isEligible && missingCodes.length > 0 && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium leading-tight">
                    Requires passing: {missingCodes.join(", ")}
                  </p>
                )}
              </CardContent>

              <CardFooter className="p-5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isInCart ? (
                  <Badge variant="success" className="text-xs font-medium py-1">
                    ✓ In Active Cart
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Available in Spring 2026
                  </span>
                )}

                <Button
                  size="sm"
                  variant={isEligible && !isCompleted ? "default" : "outline"}
                  onClick={() => setActiveCourse(course)}
                  className={`text-xs ${
                    isEligible && !isCompleted ? "bg-[#006a4e] hover:bg-[#00553e] text-white" : ""
                  }`}
                >
                  View Sections
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Course Detail & Section Selection Dialog */}
      {activeCourse && (
        <Dialog open={Boolean(activeCourse)} onClose={() => setActiveCourse(null)} maxWidth="2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-[#006a4e]">
                {activeCourse.code}
              </span>
              <Badge variant="outline" className="text-xs">
                {activeCourse.credits.toFixed(1)} Credits
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {activeCourse.department_code}
              </Badge>
            </div>
            <DialogTitle className="text-xl mt-1 text-white">{activeCourse.title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Spring 2026 Timetable & Section Capacities (Daffodil Smart City Campus)
            </DialogDescription>
          </DialogHeader>

          <DialogContent className="space-y-4">
            {/* Prerequisite status notice */}
            {(() => {
              const { isEligible, missingCodes } = getPrerequisiteStatus(
                activeCourse.prerequisite_codes,
                MOCK_COMPLETED_COURSE_CODES
              );
              if (!isEligible) {
                return (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Prerequisite Not Met</AlertTitle>
                    <AlertDescription className="text-xs">
                      You have not completed the required prerequisite course(s):{" "}
                      <strong>{missingCodes.join(", ")}</strong>. You cannot enroll in this course during regular advising without an approved prerequisite waiver from the Department Head.
                    </AlertDescription>
                  </Alert>
                );
              }
              return (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>All prerequisite conditions fulfilled. You are eligible to register.</span>
                </div>
              );
            })()}

            {/* Sections Available */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Available Class Sections ({activeCourseSections.length})
              </h4>

              {activeCourseSections.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                  No scheduled sections open for registration in the current academic wave.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {activeCourseSections.map((sec) => {
                    const { status, availableSeats } = getSectionAvailability(sec);
                    const conflict = checkScheduleConflict(sec.schedule, cart);
                    const isSelected = cart.some((s) => s.id === sec.id);

                    return (
                      <div
                        key={sec.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Section {sec.section_name}
                              </span>
                              {status === "full" ? (
                                <Badge variant="destructive" className="text-[10px]">Full</Badge>
                              ) : status === "almost-full" ? (
                                <Badge variant="warning" className="text-[10px]">Filling Fast ({availableSeats} left)</Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px]">Open ({availableSeats} seats)</Badge>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                {sec.instructor_name || "Faculty Member"}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {sec.schedule.map(formatScheduleSlot).join(" | ")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {isSelected ? (
                              <Button disabled size="sm" variant="outline" className="text-xs border-emerald-500 text-emerald-700">
                                ✓ Selected
                              </Button>
                            ) : status === "full" ? (
                              <Button disabled size="sm" variant="outline" className="text-xs">
                                Section Full
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddToCart(sec)}
                                className="bg-[#006a4e] hover:bg-[#00553e] text-white text-xs"
                              >
                                Select Section
                              </Button>
                            )}
                          </div>
                        </div>

                        {conflict.hasConflict && conflict.conflictingDetails && !isSelected && (
                          <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span>
                              Conflicts with <strong>{conflict.conflictingDetails.conflictingCourseCode}</strong> on {conflict.conflictingDetails.day} ({conflict.conflictingDetails.time})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveCourse(null)}>
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
