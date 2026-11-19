"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Send,
  X,
  ChevronRight,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  MOCK_COURSES,
  MOCK_SECTIONS,
  MOCK_DEPARTMENTS,
  MOCK_COMPLETED_COURSE_CODES,
  MOCK_STUDENT_CART_SECTIONS,
  ACTIVE_MOCK_SEMESTER_LABEL,
  type ExtendedSection,
} from "@/lib/mock/data";
import {
  getPrerequisiteStatus,
  checkScheduleConflict,
  formatScheduleSlot,
} from "@/lib/mock/helpers";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function UnifiedCoursesWorkspace() {
  // Search & Filter State
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");
  const [selectedLevel, setSelectedLevel] = React.useState("ALL");
  const [selectedEnrollmentType, setSelectedEnrollmentType] = React.useState<"ALL" | "REGULAR" | "RETAKE">("ALL");
  const [eligibilityFilter, setEligibilityFilter] = React.useState<"ALL" | "ELIGIBLE" | "LOCKED">("ALL");

  // Track expanded sections for each course (all expanded by default for instant visibility)
  const [expandedCourses, setExpandedCourses] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    MOCK_COURSES.forEach((c) => {
      initial[c.id] = true;
    });
    return initial;
  });

  // Cart State (Local Prototype)
  const [cart, setCart] = React.useState<ExtendedSection[]>(MOCK_STUDENT_CART_SECTIONS);
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);

  // Review & Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submissionTime, setSubmissionTime] = React.useState<string | null>(null);

  // Mobile Summary Drawer Open
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = React.useState(false);

  // Debounce search input (150ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Credit calculation
  const totalCredits = React.useMemo(() => {
    return cart.reduce((sum, s) => sum + (s.credits || 3.0), 0);
  }, [cart]);
  const maxAllowedCredits = 15.0; // DIU regular limit
  const isCreditOverload = totalCredits > maxAllowedCredits;

  // Filter Courses
  const filteredCourses = React.useMemo(() => {
    return MOCK_COURSES.filter((course) => {
      // Search
      const matchesSearch =
        debouncedSearch === "" ||
        course.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        course.title.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Department
      const matchesDept = selectedDept === "ALL" || course.department_code === selectedDept;

      // Level
      const matchesLevel = selectedLevel === "ALL" || course.level?.toString() === selectedLevel;

      // Prerequisite
      const isCompleted = MOCK_COMPLETED_COURSE_CODES.includes(course.code);
      const { isEligible } = getPrerequisiteStatus(course.prerequisite_codes, MOCK_COMPLETED_COURSE_CODES);

      let matchesEligibility = true;
      if (eligibilityFilter === "ELIGIBLE") matchesEligibility = isEligible && !isCompleted;
      if (eligibilityFilter === "LOCKED") matchesEligibility = !isEligible && !isCompleted;

      // Enrollment Type (Regular vs Retake/Backlog)
      let matchesEnrollmentType = true;
      if (selectedEnrollmentType === "REGULAR") {
        matchesEnrollmentType = !isCompleted && course.enrollment_type !== "retake" && course.enrollment_type !== "backlog";
      } else if (selectedEnrollmentType === "RETAKE") {
        matchesEnrollmentType = isCompleted || course.enrollment_type === "retake" || course.enrollment_type === "backlog";
      }

      return matchesSearch && matchesDept && matchesLevel && matchesEligibility && matchesEnrollmentType;
    });
  }, [debouncedSearch, selectedDept, selectedLevel, eligibilityFilter, selectedEnrollmentType]);

  // Course sections helper
  const getCourseSections = React.useCallback((courseId: string) => {
    return MOCK_SECTIONS.filter((s) => s.course_id === courseId);
  }, []);

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  // Section selection handler
  const handleSelectSection = (section: ExtendedSection) => {
    const isSameSectionSelected = cart.some((s) => s.id === section.id);
    if (isSameSectionSelected) {
      setCart((prev) => prev.filter((s) => s.id !== section.id));
      setFeedback({
        text: `Removed ${section.course_code} (${section.section_name}) from registration slip.`,
        type: "success",
      });
      return;
    }

    const otherCartSections = cart.filter((s) => s.course_id !== section.course_id);
    const conflict = checkScheduleConflict(section.schedule, otherCartSections);
    if (conflict.hasConflict && conflict.conflictingDetails) {
      setFeedback({
        text: `Schedule conflict: ${section.course_code} overlaps with ${conflict.conflictingDetails.conflictingCourseCode} (${conflict.conflictingDetails.day} ${conflict.conflictingDetails.time}).`,
        type: "warning",
      });
      return;
    }

    const courseCredits = section.credits || 3.0;
    const currentCreditsWithoutThisCourse = otherCartSections.reduce((sum, s) => sum + (s.credits || 3.0), 0);
    if (currentCreditsWithoutThisCourse + courseCredits > maxAllowedCredits) {
      setFeedback({
        text: `Credit limit exceeded: Adding this course would bring your load to ${currentCreditsWithoutThisCourse + courseCredits} Cr (maximum allowed: ${maxAllowedCredits} Cr).`,
        type: "warning",
      });
      return;
    }

    const existingSection = cart.find((s) => s.course_id === section.course_id);
    if (existingSection) {
      setCart((prev) => prev.map((s) => (s.course_id === section.course_id ? section : s)));
      setFeedback({
        text: `Switched ${section.course_code} to Section ${section.section_name}.`,
        type: "success",
      });
    } else {
      setCart((prev) => [...prev, section]);
      setFeedback({
        text: `Added ${section.course_code} (${section.section_name}) to registration slip.`,
        type: "success",
      });
    }
  };

  const handleRemoveSection = (sectionId: string) => {
    setCart((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const handleConfirmSubmit = () => {
    setIsSubmitted(true);
    setSubmissionTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setIsSubmitModalOpen(false);
  };

  return (
    <div className="space-y-4 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Top Header: Linear style */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Course Registration Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {ACTIVE_MOCK_SEMESTER_LABEL} • Department of Computer Science & Engineering
          </p>
        </div>

        {/* Mobile quick cart pill */}
        <div className="lg:hidden flex items-center justify-between p-2 rounded-md bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-300 font-mono">
            {cart.length} Courses ({totalCredits.toFixed(1)} / {maxAllowedCredits} Cr)
          </span>
          <Button
            size="sm"
            onClick={() => setIsMobileSummaryOpen(true)}
            className="bg-[#008764] hover:bg-[#007053] text-white text-xs h-7 px-2.5 ml-3"
          >
            Review Slip ({cart.length})
          </Button>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-md border text-xs animate-in fade-in duration-100 ${
            feedback.type === "success"
              ? "bg-slate-900 border-emerald-800/80 text-emerald-300"
              : "bg-slate-900 border-amber-800/80 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Layout: High-density list (Left 8 cols) + Sticky Inspector (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Course Directory */}
        <div className="lg:col-span-8 space-y-3">
          {/* Linear-style Filter Bar */}
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by course code or title (e.g. CSE224)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Departments</option>
                {MOCK_DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>

              {/* Level Filter */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Levels</option>
                <option value="1">Level 1 (Freshman)</option>
                <option value="2">Level 2 (Sophomore)</option>
                <option value="3">Level 3 (Junior)</option>
                <option value="4">Level 4 (Senior)</option>
              </select>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60 text-xs">
              <span className="text-[11px] text-slate-500 font-mono mr-1">Curriculum:</span>
              <button
                onClick={() => setSelectedEnrollmentType("ALL")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedEnrollmentType === "ALL"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Courses ({MOCK_COURSES.length})
              </button>
              <button
                onClick={() => setSelectedEnrollmentType("REGULAR")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedEnrollmentType === "REGULAR"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Regular Curriculum (10)
              </button>
              <button
                onClick={() => setSelectedEnrollmentType("RETAKE")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedEnrollmentType === "RETAKE"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Optional Retake / Backlog (2)
              </button>

              <span className="text-slate-700 mx-1">|</span>

              <button
                onClick={() => setEligibilityFilter(eligibilityFilter === "ELIGIBLE" ? "ALL" : "ELIGIBLE")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  eligibilityFilter === "ELIGIBLE"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Prerequisites Met Only
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>{filteredCourses.length} courses matching filters</span>
            <span>Department of Computer Science & Engineering</span>
          </div>

          {/* Structured Course List (Linear high-clarity layout) */}
          <div className="space-y-2.5">
            {filteredCourses.map((course) => {
              const isPassed = MOCK_COMPLETED_COURSE_CODES.includes(course.code);
              const { isEligible, missingCodes } = getPrerequisiteStatus(
                course.prerequisite_codes,
                MOCK_COMPLETED_COURSE_CODES
              );
              const isRetake = isPassed || course.enrollment_type === "retake" || course.enrollment_type === "backlog";
              const courseSections = getCourseSections(course.id);
              const selectedSection = cart.find((s) => s.course_id === course.id);
              const isExpanded = expandedCourses[course.id] ?? true;

              return (
                <div
                  key={course.id}
                  className={`rounded-lg border transition-all ${
                    selectedSection
                      ? "border-emerald-600/60 bg-slate-900/90"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700/80"
                  }`}
                >
                  {/* Course Row Header */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                          {course.code}
                        </span>
                        <h3 className="font-semibold text-sm text-white">
                          {course.title}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          {course.credits.toFixed(1)} Credits
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Level {course.level || 1}
                        </span>
                        {isRetake && (
                          <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                            Retake / Backlog
                          </span>
                        )}
                        {selectedSection && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <Check className="h-3 w-3" />
                            Enrolled: Sec {selectedSection.section_name}
                          </span>
                        )}
                      </div>

                      {/* Prerequisite status line */}
                      <div className="text-xs">
                        {isEligible ? (
                          <span className="text-slate-400 text-[11px]">
                            Prerequisites satisfied ({course.prerequisite_codes.length > 0 ? course.prerequisite_codes.join(", ") : "None required"})
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[11px] font-medium">
                            Prerequisites missing: {missingCodes.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle Sections Button */}
                    <button
                      onClick={() => toggleCourseExpanded(course.id)}
                      className="text-xs font-mono text-slate-400 hover:text-slate-200 self-end sm:self-center flex items-center gap-1 px-2 py-1 rounded bg-slate-950/60 border border-slate-800"
                    >
                      <span>{courseSections.length} Sections</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>

                  {/* Available Class Sections (Expandable high-density table) */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 pt-2 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-1 pb-1">
                        Select a Class Section for {course.code}:
                      </div>

                      <div className="space-y-1.5">
                        {courseSections.map((sec) => {
                          const isThisSectionSelected = selectedSection?.id === sec.id;
                          const isFull = sec.enrolled_count >= sec.capacity;
                          const openSeats = sec.capacity - sec.enrolled_count;

                          return (
                            <div
                              key={sec.id}
                              className={`p-2.5 rounded-md border text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isThisSectionSelected
                                  ? "bg-emerald-950/30 border-emerald-600/70"
                                  : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                              }`}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                                <div>
                                  <span className="font-semibold text-white">
                                    Section {sec.section_name}
                                  </span>
                                  <div className="text-[11px] text-slate-400">
                                    {sec.instructor_name}
                                  </div>
                                </div>

                                <div className="text-slate-300 font-mono text-[11px]">
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                                    <span>{sec.schedule.map(formatScheduleSlot).join(", ")}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Room: {sec.room}
                                  </div>
                                </div>

                                <div className="sm:text-right font-mono text-[11px]">
                                  <div className="text-slate-300">
                                    Capacity: <strong className={openSeats <= 3 ? "text-amber-400" : "text-white"}>{sec.enrolled_count}/{sec.capacity}</strong>
                                  </div>
                                  <div className={`text-[10px] ${openSeats === 0 ? "text-rose-400 font-semibold" : "text-emerald-400"}`}>
                                    {openSeats === 0 ? "Section Full (0 seats)" : `${openSeats} seats available`}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 self-end sm:self-center">
                                <Button
                                  size="sm"
                                  disabled={!isEligible || (isFull && !isThisSectionSelected)}
                                  onClick={() => handleSelectSection(sec)}
                                  className={`text-xs h-7 px-3 font-medium transition-colors ${
                                    isThisSectionSelected
                                      ? "bg-slate-800 hover:bg-rose-950/80 text-emerald-400 hover:text-rose-300 border border-emerald-700/60 hover:border-rose-700"
                                      : isFull
                                      ? "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
                                      : selectedSection
                                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                      : "bg-[#008764] hover:bg-[#007053] text-white"
                                  }`}
                                >
                                  {isThisSectionSelected
                                    ? "Selected ✓ (Click to Remove)"
                                    : isFull
                                    ? "Full"
                                    : selectedSection
                                    ? `Switch to Sec ${sec.section_name}`
                                    : `Select Section ${sec.section_name}`}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCourses.length === 0 && (
              <div className="p-8 text-center rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
                No course offerings matched your filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Registration Slip Inspector (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-18">
          <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-sm space-y-3">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-800 space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Registration Slip
                </h2>
                <span className="font-mono text-[11px] text-slate-400">
                  {ACTIVE_MOCK_SEMESTER_LABEL}
                </span>
              </div>

              {/* Credit Meter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-slate-400">Credit Load:</span>
                  <span className={`font-semibold ${isCreditOverload ? "text-rose-400 font-bold" : "text-emerald-400"}`}>
                    {totalCredits.toFixed(1)} / {maxAllowedCredits.toFixed(1)} Cr
                  </span>
                </div>
                <Progress
                  value={(totalCredits / maxAllowedCredits) * 100}
                  className="h-1.5 bg-slate-950"
                  variant={isCreditOverload ? "destructive" : "diu"}
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{cart.length} Courses Selected</span>
                  <span>Max Limit: 15.0 Cr</span>
                </div>
              </div>
            </div>

            {/* Selected Courses List */}
            <div className="p-4 pt-1 space-y-2 max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
              {cart.map((sec) => (
                <div
                  key={sec.id}
                  className="pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-bold text-emerald-400">{sec.course_code}</span>
                      <span className="text-slate-200 font-medium">Sec {sec.section_name}</span>
                      <span className="text-[10px] font-mono text-slate-500">({sec.credits || 3.0} Cr)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {sec.instructor_name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {sec.schedule.map(formatScheduleSlot).join(", ")}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSection(sec.id)}
                    title="Remove from slip"
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No courses selected yet. Select sections from the catalog to build your advising slip.
                </div>
              )}
            </div>

            {/* Inspector Footer */}
            <div className="p-4 pt-3 border-t border-slate-800 space-y-3 bg-slate-950/40 rounded-b-lg">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Tuition Accounts Cleared: <strong className="text-slate-300 font-mono">DIU-AC-2026-8812</strong></span>
              </div>

              <Button
                disabled={cart.length === 0 || isCreditOverload}
                onClick={() => setIsSubmitModalOpen(true)}
                className="w-full bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium py-2 h-9 shadow-xs"
              >
                Review & Submit Advising Slip
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Review & Submit Confirmation Modal (Stripe Checkout clarity) */}
      <Dialog open={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-lg">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" />
              Review & Submit Advising Slip
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Verify your proposed course sections before forwarding your application to your academic advisor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            {/* Checklist */}
            <div className="p-3 rounded-md bg-slate-950 border border-slate-800 space-y-1.5 text-slate-300 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Prerequisites Satisfied for All {cart.length} Courses</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Zero Timetable Clashes Detected</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Total Load: {totalCredits} Cr (Within 15.0 Cr Limit)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Tuition Clearance Confirmed (DIU-AC-2026-8812)</span>
              </div>
            </div>

            {/* Courses Table */}
            <div className="rounded-md border border-slate-800 overflow-hidden font-mono text-[11px]">
              <div className="p-2 bg-slate-950 text-slate-400 font-semibold grid grid-cols-12 gap-1 border-b border-slate-800">
                <span className="col-span-3">Code</span>
                <span className="col-span-3">Section</span>
                <span className="col-span-4">Schedule</span>
                <span className="col-span-2 text-right">Credits</span>
              </div>
              <div className="divide-y divide-slate-800 max-h-44 overflow-y-auto">
                {cart.map((sec) => (
                  <div key={sec.id} className="p-2 grid grid-cols-12 gap-1 items-center bg-slate-900/60">
                    <span className="col-span-3 font-bold text-emerald-400">{sec.course_code}</span>
                    <span className="col-span-3 text-slate-300">Sec {sec.section_name}</span>
                    <span className="col-span-4 text-slate-400 text-[10px]">{sec.schedule.map(formatScheduleSlot).join(", ")}</span>
                    <span className="col-span-2 text-right text-slate-200">{sec.credits || 3.0} Cr</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              className="bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium h-8"
            >
              Confirm & Submit to Advisor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Success Dialog */}
      <Dialog open={isSubmitted} onClose={() => setIsSubmitted(false)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md text-center p-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-semibold text-white">
            Advising Slip Submitted Successfully
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 space-y-2 mt-2">
            <p>
              Your advising slip has been recorded and submitted for audit by your academic advisor, <strong>Dr. Sheak Rashed Haider Noori</strong>.
            </p>
            <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
              Reference: <strong className="text-emerald-400">REG-2026-SP-7819</strong> • {submissionTime}
            </div>
          </DialogDescription>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button asChild size="sm" className="bg-[#008764] hover:bg-[#007053] text-white text-xs h-8">
              <Link href="/student/tracking">
                Go to Application Tracking
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Drawer (Bottom Sheet) */}
      {isMobileSummaryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs lg:hidden flex flex-col justify-end">
          <div className="p-4 rounded-t-xl bg-slate-900 border-t border-slate-800 max-h-[85vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-white">
                Registration Slip Summary
              </h3>
              <button
                onClick={() => setIsMobileSummaryOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Credits:</span>
                <span className="font-bold text-emerald-400">{totalCredits.toFixed(1)} / {maxAllowedCredits} Cr</span>
              </div>
              <Progress
                value={(totalCredits / maxAllowedCredits) * 100}
                className="h-1.5 bg-slate-950"
                variant={isCreditOverload ? "destructive" : "diu"}
              />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {cart.map((sec) => (
                <div key={sec.id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-mono font-bold text-emerald-400">{sec.course_code} • Sec {sec.section_name}</div>
                    <div className="text-[10px] text-slate-400">{sec.schedule.map(formatScheduleSlot).join(", ")}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveSection(sec.id)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              disabled={cart.length === 0 || isCreditOverload}
              onClick={() => {
                setIsMobileSummaryOpen(false);
                setIsSubmitModalOpen(true);
              }}
              className="w-full bg-[#008764] hover:bg-[#007053] text-white text-xs font-medium py-2 h-9"
            >
              Review & Submit Advising Slip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
