"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  Check,
  Layers,
  BookOpen,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  MOCK_COURSES,
  MOCK_SECTIONS,
  MOCK_DEPARTMENTS,
  MOCK_COMPLETED_COURSE_CODES,
  MOCK_STUDENT_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
  ACTIVE_MOCK_REGISTRATION_WINDOW,
  type ExtendedSection,
  type ExtendedCourse,
} from "@/lib/mock/data";
import {
  getPrerequisiteStatus,
} from "@/lib/mock/helpers";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { submitStudentRegistration } from "@/app/courses/actions";
import type { Database } from "@/types/database";

export interface SelectedCourseItem {
  course: ExtendedCourse;
  section: ExtendedSection;
  courseType: "general" | "retake";
}

interface UnifiedCoursesWorkspaceProps {
  initialProfile?: Database["public"]["Tables"]["profiles"]["Row"];
  initialActiveRegistration?: {
    id: string;
    status: string;
    previous_section: string;
    desired_section: string;
    reference_id: string;
    submitted_at: string;
    courses: Array<{
      courseId: string;
      courseCode: string;
      courseTitle: string;
      credits: number;
      sectionId: string;
      sectionName: string;
      courseType: "general" | "retake";
    }>;
    totalCredits: number;
    generalCourseCount: number;
    retakeCourseCount: number;
  } | null;
}

export function UnifiedCoursesWorkspace({
  initialProfile,
  initialActiveRegistration,
}: UnifiedCoursesWorkspaceProps) {
  const profile = initialProfile || MOCK_STUDENT_PROFILE;

  // Step state: 1 = Section Info, 2 = Course Selection, 3 = Review & Submit, 4 = Submitted Receipt
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(() => {
    if (initialActiveRegistration?.status === "pending_advisor" || initialActiveRegistration?.status === "approved") {
      return 4;
    }
    return 1;
  });

  // Step 1: Section Fields
  const [previousSection, setPreviousSection] = React.useState(
    initialActiveRegistration?.previous_section || "69_K"
  );
  const [desiredSection, setDesiredSection] = React.useState(
    initialActiveRegistration?.desired_section || "69_D"
  );
  const [sectionError, setSectionError] = React.useState<string | null>(null);

  // Step 2: Selected Courses Cart (Initially all courses marked general)
  const [selectedCourses, setSelectedCourses] = React.useState<SelectedCourseItem[]>(() => {
    if (initialActiveRegistration?.courses && initialActiveRegistration.courses.length > 0) {
      return initialActiveRegistration.courses.map((c) => {
        const co = MOCK_COURSES.find((item) => item.code === c.courseCode) || MOCK_COURSES[0];
        const sec = MOCK_SECTIONS.find((item) => item.id === c.sectionId) || MOCK_SECTIONS[0];
        return {
          course: co,
          section: sec,
          courseType: c.courseType || "general",
        };
      });
    }

    // Default initial enrollment (all initially marked general)
    const initialCourseCodes = ["CSE221", "CSE222", "CSE225", "CSE110"];
    const items: SelectedCourseItem[] = [];

    initialCourseCodes.forEach((code) => {
      const co = MOCK_COURSES.find((c) => c.code === code);
      if (co) {
        // Pick section matching desired section (69_D) or fallback
        const sec =
          MOCK_SECTIONS.find((s) => s.course_id === co.id && s.section_name.includes("69_D")) ||
          MOCK_SECTIONS.find((s) => s.course_id === co.id) ||
          MOCK_SECTIONS[0];
        items.push({
          course: co,
          section: sec,
          courseType: "general",
        });
      }
    });

    return items;
  });

  // Search & Filter State
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");
  const [selectedLevel, setSelectedLevel] = React.useState("ALL");
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submittedData, setSubmittedData] = React.useState<{
    registrationId: string;
    referenceId: string;
    submittedAt: string;
  } | null>(() => {
    if (initialActiveRegistration) {
      return {
        registrationId: initialActiveRegistration.id,
        referenceId: initialActiveRegistration.reference_id,
        submittedAt: initialActiveRegistration.submitted_at,
      };
    }
    return null;
  });

  // Debounce search input (150ms for snappy Linear-like response)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Credit calculation
  const totalCredits = React.useMemo(() => {
    return selectedCourses.reduce((sum, item) => sum + (item.section.credits || item.course.credits || 3.0), 0);
  }, [selectedCourses]);

  const maxAllowedCredits = 15.0; // Standard DIU undergraduate term cap
  const isCreditOverload = totalCredits > maxAllowedCredits;

  const generalCourseCount = React.useMemo(() => {
    return selectedCourses.filter((c) => c.courseType === "general").length;
  }, [selectedCourses]);

  const retakeCourseCount = React.useMemo(() => {
    return selectedCourses.filter((c) => c.courseType === "retake").length;
  }, [selectedCourses]);

  // Filter available courses
  const filteredCourses = React.useMemo(() => {
    return MOCK_COURSES.filter((course) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q);

      const matchesDept = selectedDept === "ALL" || course.department_code === selectedDept;
      const matchesLevel = selectedLevel === "ALL" || course.level?.toString() === selectedLevel;

      return matchesSearch && matchesDept && matchesLevel;
    });
  }, [debouncedSearch, selectedDept, selectedLevel]);

  // Get sections available for a specific course
  const getCourseSections = React.useCallback((courseId: string) => {
    return MOCK_SECTIONS.filter((s) => s.course_id === courseId);
  }, []);

  // Section Step 1 Validation
  const handleProceedFromSections = () => {
    const prevTrimmed = previousSection.trim();
    const desiredTrimmed = desiredSection.trim();

    if (!prevTrimmed || !desiredTrimmed) {
      setSectionError("Both Previous Section (e.g. 69_K) and Desired Section (e.g. 69_D) are mandatory.");
      return;
    }

    setSectionError(null);
    setCurrentStep(2);
  };

  // Add / Switch Course in Selection
  const handleToggleCourse = (course: ExtendedCourse, chosenSection?: ExtendedSection) => {
    const existingIndex = selectedCourses.findIndex((c) => c.course.id === course.id);

    // If already in cart, remove
    if (existingIndex >= 0 && !chosenSection) {
      setSelectedCourses((prev) => prev.filter((c) => c.course.id !== course.id));
      setFeedback({
        text: `Removed ${course.code} from course selection.`,
        type: "success",
      });
      return;
    }

    // Pick section: either chosen, or one matching desiredSection, or the first available
    const available = getCourseSections(course.id);
    const targetSection =
      chosenSection ||
      available.find((s) => s.section_name.toLowerCase().includes(desiredSection.trim().toLowerCase())) ||
      available[0];

    if (!targetSection) {
      setFeedback({
        text: `No active class sections are currently scheduled for ${course.code}.`,
        type: "warning",
      });
      return;
    }

    // Credit overload safety check
    const otherSections = selectedCourses
      .filter((c) => c.course.id !== course.id)
      .map((c) => c.section);
    const additionalCredits = targetSection.credits || course.credits || 3.0;
    const currentCreditsWithoutThis = otherSections.reduce((sum, s) => sum + (s.credits || 3.0), 0);
    if (currentCreditsWithoutThis + additionalCredits > maxAllowedCredits) {
      setFeedback({
        text: `Credit limit warning: Total load would reach ${(currentCreditsWithoutThis + additionalCredits).toFixed(1)} Cr (maximum regular cap: ${maxAllowedCredits} Cr).`,
        type: "warning",
      });
    }

    if (existingIndex >= 0) {
      // Update section of already selected course
      setSelectedCourses((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, section: targetSection }
            : item
        )
      );
      setFeedback({
        text: `Updated ${course.code} to Section ${targetSection.section_name}.`,
        type: "success",
      });
    } else {
      // Add new course with default classification (initially all marked general)
      setSelectedCourses((prev) => [
        ...prev,
        {
          course,
          section: targetSection,
          courseType: "general",
        },
      ]);
      setFeedback({
        text: `Added ${course.code} (Section ${targetSection.section_name}) as General course.`,
        type: "success",
      });
    }
  };

  // Switch section for an already selected course
  const handleSectionChange = (courseId: string, newSectionId: string) => {
    const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
    if (!newSection) return;

    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.course.id === courseId ? { ...item, section: newSection } : item
      )
    );
  };

  // Remove a course from selection
  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.course.id !== courseId));
  };

  // Step 3: Change course classification for an individual course
  const handleSetClassification = (courseId: string, courseType: "general" | "retake") => {
    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.course.id === courseId ? { ...item, courseType } : item
      )
    );
  };

  // Step 4 & 5: Submission Handler
  const handleFinalSubmit = async () => {
    if (selectedCourses.length === 0) {
      setSubmitError("Please select at least 1 course before submitting.");
      return;
    }

    if (!previousSection.trim() || !desiredSection.trim()) {
      setSubmitError("Previous section and desired section must be specified.");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        previousSection: previousSection.trim(),
        desiredSection: desiredSection.trim(),
        courses: selectedCourses.map((c) => ({
          courseId: c.course.id,
          courseCode: c.course.code,
          courseTitle: c.course.title,
          credits: c.section.credits || c.course.credits,
          sectionId: c.section.id,
          sectionName: c.section.section_name,
          courseType: c.courseType,
        })),
      };

      const result = await submitStudentRegistration(payload);

      if (!result.success) {
        setIsSubmitting(false);
        setSubmitError(result.error || "Failed to submit course registration application.");
        return;
      }

      setIsSubmitting(false);
      setSubmittedData({
        registrationId: result.registrationId || "reg-app-submitted",
        referenceId: result.referenceId || "REG-2027-SP-7819",
        submittedAt: result.submittedAt || new Date().toISOString(),
      });
      setCurrentStep(4);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : "An unexpected network error occurred.";
      setSubmitError(message);
    }
  };

  // Stepper Header Component
  const renderStepper = () => {
    const steps = [
      { num: 1, title: "Section Info", desc: `${previousSection || "—"} → ${desiredSection || "—"}` },
      { num: 2, title: "Course Selection", desc: `${selectedCourses.length} Courses • ${generalCourseCount} Gen, ${retakeCourseCount} Ret` },
      { num: 3, title: "Review & Submit", desc: "Final Verification" },
    ];

    return (
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-3 sm:p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {steps.map((st) => {
            const isCompleted = currentStep > st.num || currentStep === 4;
            const isCurrent = currentStep === st.num;

            return (
              <button
                key={st.num}
                type="button"
                onClick={() => {
                  if (currentStep !== 4 && (isCompleted || isCurrent || st.num < currentStep)) {
                    setCurrentStep(st.num as 1 | 2 | 3);
                  }
                }}
                disabled={currentStep === 4 || (!isCompleted && !isCurrent)}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                  isCurrent
                    ? "bg-[#172136] border border-[#25324d] text-white shadow-xs"
                    : isCompleted
                    ? "hover:bg-[#1a233a] cursor-pointer text-slate-300"
                    : "opacity-40 cursor-not-allowed text-slate-500"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-[#008764] text-white"
                      : "bg-[#1c263c] text-slate-400"
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check className="h-3.5 w-3.5" /> : st.num}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate">
                    {st.title}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {st.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-slate-100 max-w-7xl mx-auto py-2">
      {/* Top Header: Linear simplicity */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#1c263c] pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Course Registration Application</span>
            <span className="text-xs font-mono font-normal text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80">
              {ACTIVE_MOCK_SEMESTER_LABEL}
            </span>
          </h1>
          <p className="text-xs text-[#8e9db2] mt-0.5">
            Daffodil International University • Registration Window: {ACTIVE_MOCK_REGISTRATION_WINDOW}
          </p>
        </div>

        {/* Quick return or status */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Interactive Progress Stepper */}
      {renderStepper()}

      {/* Floating feedback alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs animate-in fade-in duration-100 ${
            feedback.type === "success"
              ? "bg-[#121827] border-emerald-800 text-emerald-300"
              : "bg-[#121827] border-amber-800 text-amber-300"
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

      {/* ========================================================================= */}
      {/* STEP 1: PREVIOUS SECTION AND DESIRED SECTION                              */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto py-4 space-y-6">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-1.5 border-b border-[#1c263c] pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#172136] text-blue-400 text-xs font-medium mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Step 1 of 4 • Academic Sections</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Academic Section Details
              </h2>
              <p className="text-xs text-[#8e9db2] leading-relaxed">
                Provide your previous enrolled section and your desired cohort section for {ACTIVE_MOCK_SEMESTER_LABEL}.
                This informs your academic advisor of your cohort scheduling preference.
              </p>
            </div>

            {sectionError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{sectionError}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Previous Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="prevSection" className="text-xs font-semibold text-white">
                    Previous Section <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">Example: 69_K</span>
                </div>
                <input
                  id="prevSection"
                  type="text"
                  value={previousSection}
                  onChange={(e) => {
                    setPreviousSection(e.target.value);
                    if (sectionError) setSectionError(null);
                  }}
                  placeholder="e.g. 69_K"
                  className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-[#1c263c] rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                />
                <p className="text-[11px] text-[#8e9db2]">
                  The class section you attended in the preceding semester (e.g., 69_K, 60_A, 58_B).
                </p>
              </div>

              {/* Desired Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="desiredSection" className="text-xs font-semibold text-white">
                    Desired Section <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">Example: 69_D</span>
                </div>
                <input
                  id="desiredSection"
                  type="text"
                  value={desiredSection}
                  onChange={(e) => {
                    setDesiredSection(e.target.value);
                    if (sectionError) setSectionError(null);
                  }}
                  placeholder="e.g. 69_D"
                  className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-[#1c263c] rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                />
                <p className="text-[11px] text-[#8e9db2]">
                  The target section cohort you are requesting for your courses this semester (e.g., 69_D, 60_A).
                </p>
              </div>

              {/* Educational Note */}
              <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#1c263c] text-xs text-[#8e9db2] flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200">How DIU Cohort Sections Work:</div>
                  <p className="text-[11px] leading-relaxed">
                    Sections (such as <strong className="text-emerald-400 font-mono">69_K</strong> or <strong className="text-emerald-400 font-mono">69_D</strong>) represent your academic cohort. When you advance to Course Selection, courses matching your desired section will be prioritized.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-[#1c263c]">
              <Link
                href="/dashboard"
                className="text-xs text-[#8e9db2] hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <Button
                type="button"
                onClick={handleProceedFromSections}
                className="bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs px-5 h-9 rounded-xl transition-all shadow-xs"
              >
                <span>Continue to Course Selection</span>
                <ArrowRight className="h-4 w-4 ml-1 text-[#0b0f19]" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: COURSE SELECTION WORKSPACE                                        */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Course Directory (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            {/* Context bar with Section Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121827] border border-[#1c263c] text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#8e9db2]">Assigned Cohort:</span>
                <span className="font-mono text-emerald-400 font-bold bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1c263c]">
                  Prev: {previousSection}
                </span>
                <span className="text-slate-600">&rarr;</span>
                <span className="font-mono text-sky-400 font-bold bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1c263c]">
                  Desired: {desiredSection}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
              >
                Edit Sections
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-3 rounded-xl border border-[#1c263c] bg-[#121827] space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by course code or title (e.g. CSE221, Algorithms, Math)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Department Dropdown */}
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Departments</option>
                  {MOCK_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} ({d.name})
                    </option>
                  ))}
                </select>

                {/* Level Dropdown */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Academic Levels</option>
                  <option value="1">Level 1 (Freshman)</option>
                  <option value="2">Level 2 (Sophomore)</option>
                  <option value="3">Level 3 (Junior)</option>
                  <option value="4">Level 4 (Senior)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8e9db2] pt-1">
                <span>
                  Showing <strong>{filteredCourses.length}</strong> available courses in DIU curriculum
                </span>
                {(searchInput || selectedDept !== "ALL" || selectedLevel !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSelectedDept("ALL");
                      setSelectedLevel("ALL");
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Courses List */}
            <div className="space-y-2.5">
              {filteredCourses.length === 0 ? (
                <div className="p-12 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">No courses match your query</div>
                  <p className="text-xs text-[#8e9db2] max-w-sm mx-auto">
                    Try searching for another course code (e.g. CSE110, CSE221) or clear the department and level filters.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchInput("");
                      setSelectedDept("ALL");
                      setSelectedLevel("ALL");
                    }}
                    className="text-xs mt-2 border-[#1c263c]"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const selectedItem = selectedCourses.find((c) => c.course.id === course.id);
                  const isSelected = Boolean(selectedItem);
                  const { isEligible, missingCodes } = getPrerequisiteStatus(
                    course.prerequisite_codes,
                    MOCK_COMPLETED_COURSE_CODES
                  );
                  const availableSections = getCourseSections(course.id);

                  return (
                    <div
                      key={course.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[#141d30] border-blue-600/70 shadow-xs"
                          : "bg-[#121827] border-[#1c263c] hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c]">
                              {course.code}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {course.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {course.credits.toFixed(1)} Credits
                            </span>
                            {course.level && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Level {course.level}
                              </span>
                            )}
                          </div>

                          {/* Prerequisites compliance tag */}
                          <div className="text-[11px] text-[#8e9db2] flex items-center gap-1.5 pt-0.5">
                            {course.prerequisite_codes.length === 0 ? (
                              <span className="text-slate-500">Prerequisites: None required</span>
                            ) : isEligible ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Prerequisites satisfied ({course.prerequisite_codes.join(", ")})
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Prerequisite missing: {missingCodes.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add / Selected Action */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {selectedItem ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                <span>Sec {selectedItem.section.section_name}</span>
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveCourse(course.id)}
                                className="h-7 px-2 text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/40"
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleToggleCourse(course)}
                              className="h-7 text-xs bg-white hover:bg-slate-100 text-[#0b0f19] font-medium"
                            >
                              + Add Course
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Section Picker & Classification Row */}
                      {availableSections.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#1c263c] flex flex-wrap items-center justify-between gap-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-3 text-[#8e9db2]">
                            <div className="flex items-center gap-2">
                              <span>Class Section:</span>
                              {selectedItem ? (
                                <select
                                  value={selectedItem.section.id}
                                  onChange={(e) => handleSectionChange(course.id, e.target.value)}
                                  className="text-xs font-mono bg-[#0b0f19] border border-[#1c263c] rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {availableSections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      Section {s.section_name} ({s.enrolled_count}/{s.capacity} seats)
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {availableSections.length} offering{availableSections.length > 1 ? "s" : ""} available ({availableSections.map((s) => s.section_name).join(", ")})
                                </span>
                              )}
                            </div>

                            {/* Option: General or Retake (initially all marked general) */}
                            {selectedItem && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-[#8e9db2]">Type:</span>
                                <div className="inline-flex rounded-lg bg-[#0b0f19] p-0.5 border border-[#1c263c]">
                                  <button
                                    type="button"
                                    onClick={() => handleSetClassification(course.id, "general")}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                      selectedItem.courseType === "general"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-[#8e9db2] hover:text-white"
                                    }`}
                                  >
                                    General
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetClassification(course.id, "retake")}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                      selectedItem.courseType === "retake"
                                        ? "bg-amber-600 text-white shadow-xs"
                                        : "text-[#8e9db2] hover:text-white"
                                    }`}
                                  >
                                    Retake
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Persistent Selected-Course Summary (4 cols) */}
          <div className="lg:col-span-4 sticky top-20 space-y-3">
            <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 space-y-4 shadow-sm">
              <div className="space-y-1 border-b border-[#1c263c] pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Registration Slip
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {ACTIVE_MOCK_SEMESTER_LABEL}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Cohort: <strong className="text-white">{previousSection} &rarr; {desiredSection}</strong>
                </div>
              </div>

              {/* Credit Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8e9db2]">Credit Load:</span>
                  <span className={isCreditOverload ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                    {totalCredits.toFixed(1)} / {maxAllowedCredits.toFixed(1)} Cr
                  </span>
                </div>
                <Progress
                  value={Math.min((totalCredits / maxAllowedCredits) * 100, 100)}
                  className={`h-2 ${isCreditOverload ? "[&>div]:bg-rose-500" : "[&>div]:bg-[#008764]"}`}
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{selectedCourses.length} Courses Selected</span>
                  <span>Max Limit: {maxAllowedCredits.toFixed(1)} Cr</span>
                </div>
              </div>

              {/* Selected List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {selectedCourses.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No courses added yet. Select courses from the left list.
                  </div>
                ) : (
                  selectedCourses.map((item) => (
                    <div
                      key={item.course.id}
                      className="p-2.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.course.code}
                          </span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            Sec {item.section.section_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({item.section.credits || item.course.credits} Cr)
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8e9db2] truncate">
                          {item.course.title}
                        </div>
                        {/* Option: General or Retake per course */}
                        <div className="flex items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleSetClassification(item.course.id, "general")}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              item.courseType === "general"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-[#121827] text-slate-400 hover:text-white border border-[#1c263c]"
                            }`}
                          >
                            General
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetClassification(item.course.id, "retake")}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              item.courseType === "retake"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-[#121827] text-slate-400 hover:text-white border border-[#1c263c]"
                            }`}
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCourse(item.course.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition-colors"
                        title="Remove course"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Accounts Clearance Voucher */}
              <div className="p-2.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] flex items-center gap-2 text-[11px] text-[#8e9db2]">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Tuition Accounts Cleared: DIU-AC-2027-4561</span>
              </div>

              {/* Breakdown summary */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>General: <strong className="text-blue-400">{generalCourseCount}</strong></span>
                <span>Retake: <strong className="text-amber-400">{retakeCourseCount}</strong></span>
              </div>

              {/* Navigation Actions */}
              <div className="space-y-2 pt-1 border-t border-[#1c263c]">
                <Button
                  disabled={selectedCourses.length === 0 || isCreditOverload}
                  onClick={() => setCurrentStep(3)}
                  className="w-full bg-white hover:bg-slate-100 text-[#0b0f19] text-xs font-semibold h-9 rounded-xl shadow-xs transition-all disabled:opacity-40"
                >
                  <span>Review & Submit Application</span>
                  <ArrowRight className="h-4 w-4 ml-1 text-[#0b0f19]" />
                </Button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full text-center text-xs text-[#8e9db2] hover:text-white py-1 transition-colors"
                >
                  &larr; Back to Section Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW APPLICATION & FINAL VERIFICATION                          */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="max-w-4xl mx-auto py-2 space-y-6">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Header */}
            <div className="space-y-1.5 border-b border-[#1c263c] pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#172136] text-blue-400 text-xs font-medium mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Step 3 of 3 • Final Review</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Review Course Registration Application
              </h2>
              <p className="text-xs text-[#8e9db2] leading-relaxed">
                Carefully review all submitted academic and section details before forwarding to your academic advisor for final audit.
              </p>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. STUDENT INFORMATION */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                1. Student Profile Information
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Full Name:</span>
                  <strong className="text-white">{profile.full_name}</strong>
                </div>
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Student ID:</span>
                  <strong className="font-mono text-emerald-400">{profile.diu_id || "221-15-12345"}</strong>
                </div>
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Academic Batch:</span>
                  <span className="text-slate-300">{profile.batch || "60th Batch"}</span>
                </div>
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Institutional Email:</span>
                  <span className="font-mono text-slate-300 truncate block">{profile.email}</span>
                </div>
              </div>
            </div>

            {/* 2. SECTION INFORMATION */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  2. Academic Section Assignment
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span>
                    Previous Section: <strong className="text-white px-2 py-0.5 rounded bg-[#121827] border border-[#1c263c]">{previousSection}</strong>
                  </span>
                  <span className="text-slate-600">&rarr;</span>
                  <span>
                    Desired Section: <strong className="text-emerald-400 px-2 py-0.5 rounded bg-[#121827] border border-[#1c263c]">{desiredSection}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
              >
                Change Sections
              </button>
            </div>

            {/* 3. SELECTED COURSES TABLE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  3. Selected Courses & Classifications ({selectedCourses.length})
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                >
                  Edit Courses
                </button>
              </div>

              <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121827] border-b border-[#1c263c] font-mono text-[11px] text-[#8e9db2]">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Course Code & Title</th>
                      <th className="py-2.5 px-3 font-medium w-16 text-center">Credits</th>
                      <th className="py-2.5 px-3 font-medium w-32">Classification</th>
                      <th className="py-2.5 px-3 font-medium w-32 text-right">Assigned Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c263c]">
                    {selectedCourses.map((item) => (
                      <tr key={item.course.id} className="hover:bg-[#121827]/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-emerald-400 mr-2">
                            {item.course.code}
                          </span>
                          <span className="text-white font-medium">
                            {item.course.title}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {item.section.credits || item.course.credits}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.courseType === "general" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950/70 border border-blue-800 text-blue-300">
                              General
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/70 border border-amber-800 text-amber-300">
                              Retake
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-right">
                          Sec {item.section.section_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. APPLICATION METRICS SUMMARY */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[#8e9db2] block text-[11px]">Total Courses:</span>
                <strong className="text-white text-sm">{selectedCourses.length} Courses</strong>
              </div>
              <div>
                <span className="text-[#8e9db2] block text-[11px]">Total Credits:</span>
                <strong className="text-emerald-400 text-sm">{totalCredits.toFixed(1)} Credits</strong>
              </div>
              <div>
                <span className="text-[#8e9db2] block text-[11px]">Course Breakdown:</span>
                <span className="text-slate-300">
                  {generalCourseCount} General • {retakeCourseCount} Retake
                </span>
              </div>
              <div>
                <span className="text-[#8e9db2] block text-[11px]">Payment Clearance:</span>
                <span className="text-emerald-400 font-medium">Cleared (DIU-AC-2027)</span>
              </div>
            </div>

            {/* Submission Actions */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#1c263c]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="text-xs border-[#1c263c] text-slate-300 h-9 rounded-xl order-2 sm:order-1"
              >
                &larr; Back to Course Selection
              </Button>

              <Button
                type="button"
                disabled={isSubmitting || selectedCourses.length === 0}
                onClick={handleFinalSubmit}
                className="bg-[#008764] hover:bg-[#007053] text-white font-semibold text-xs px-6 h-10 rounded-xl transition-all shadow-md active:scale-[0.98] order-1 sm:order-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Submit Advising Slip to Advisor</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUBMITTED SUCCESS STATE                                           */}
      {/* ========================================================================= */}
      {currentStep === 4 && submittedData && (
        <div className="max-w-xl mx-auto py-8">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-8 text-center space-y-5 shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Advising Application Submitted
              </h2>
              <p className="text-xs text-[#8e9db2] max-w-sm mx-auto leading-relaxed">
                Your course registration request has been forwarded to your assigned academic advisor, <strong>Dr. Rahman Ahmed</strong>.
              </p>
            </div>

            {/* Submission Receipt Card */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] text-left space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-[#1c263c] pb-2">
                <span className="text-[#8e9db2]">Reference Voucher:</span>
                <strong className="text-emerald-400">{submittedData.referenceId}</strong>
              </div>
              <div className="flex justify-between border-b border-[#1c263c] pb-2">
                <span className="text-[#8e9db2]">Assigned Sections:</span>
                <span className="text-slate-300">{previousSection} &rarr; {desiredSection}</span>
              </div>
              <div className="flex justify-between border-b border-[#1c263c] pb-2">
                <span className="text-[#8e9db2]">Enrolled Courses:</span>
                <span className="text-slate-300">{selectedCourses.length} Courses ({totalCredits.toFixed(1)} Cr)</span>
              </div>
              <div className="flex justify-between border-b border-[#1c263c] pb-2">
                <span className="text-[#8e9db2]">Course Types:</span>
                <span className="text-slate-300">{generalCourseCount} General • {retakeCourseCount} Retake</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e9db2]">Status:</span>
                <StatusBadge status="pending_advisor" className="text-[10px]" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/student/tracking"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#008764] hover:bg-[#007053] text-white font-semibold text-xs transition-all shadow-sm"
              >
                <span>Go to Application Tracking</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto text-xs border-[#1c263c] text-slate-300 h-10 rounded-xl"
              >
                Modify Selections
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
