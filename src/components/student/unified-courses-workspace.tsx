"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Check,
  Layers,
  BookOpen,
  ArrowRight,
  Clock,
  CreditCard,
  Users,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
  FlaskConical,
} from "lucide-react";
import {
  MOCK_SECTIONS,
  MOCK_STUDENT_PROFILE,
  ACTIVE_MOCK_SEMESTER_LABEL,
  ACTIVE_MOCK_REGISTRATION_WINDOW,
  type ExtendedSection,
  type ExtendedCourse,
} from "@/lib/mock/data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitStudentRegistration } from "@/app/courses/actions";
import type { Database } from "@/types/database";
import type { PaymentClearanceRecord } from "@/lib/payment/payment-service";
import {
  COURSE_CATEGORIES,
  CATEGORY_LABELS,
  SPECIALIZATION_GROUPS,
  SPECIALIZATION_LABELS,
} from "@/lib/validations/curriculum";

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
  eligibleCourses?: ExtendedCourse[];
  studentBatch?: string;
  activeSemesterName?: string;
  paymentClearance?: PaymentClearanceRecord | null;
}

export function UnifiedCoursesWorkspace({
  initialProfile,
  initialActiveRegistration,
  eligibleCourses = [],
  studentBatch = "60",
  activeSemesterName = ACTIVE_MOCK_SEMESTER_LABEL,
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

  // Preferred lab subgroup for the desired section: "1" = Lab D1, "2" = Lab D2
  const [preferredLabSubgroup, setPreferredLabSubgroup] = React.useState<"1" | "2">("1");

  // Cohort letter extraction helper (e.g. "69_D" -> "D", "69_K" -> "K", "60_A" -> "A")
  const cohortLetter = React.useMemo(() => {
    const trimmed = desiredSection.trim().toUpperCase();
    const match = trimmed.match(/_([A-Z0-9]+)/i);
    if (match) return match[1];
    const letters = trimmed.match(/[A-Z]+/);
    return letters ? letters[0] : "D";
  }, [desiredSection]);

  // Batch detection helper
  const detectedBatch = React.useMemo(() => {
    const raw = studentBatch || (profile as { batch?: string })?.batch || "69";
    const m = String(raw).match(/\d+/);
    return m ? m[0] : "69";
  }, [studentBatch, profile]);

  // Batch cohort suggestions for Desired Section
  const batchCohortSuggestions = React.useMemo(() => {
    const b = detectedBatch;
    return [`${b}_D`, `${b}_K`, `${b}_A`, `${b}_B`, `${b}_C`];
  }, [detectedBatch]);

  // Previous section suggestions
  const previousSectionSuggestions = React.useMemo(() => {
    const b = detectedBatch;
    return [`${b}_K`, `${b}_D`, `${b}_A`, `${b}_B`];
  }, [detectedBatch]);

  // State to toggle the detailed course roster under the desired section
  const [showSectionRoster, setShowSectionRoster] = React.useState(true);

  // Compute live seat statistics for the chosen desired section
  const desiredSectionStats = React.useMemo(() => {
    const trimmed = desiredSection.trim().toUpperCase();
    if (!trimmed) return null;

    // Find all sections matching this cohort
    // Matches exact: 69_D, 69_D1, 69_D2, 69_D_L or startsWith 69_D
    const matchingSections = MOCK_SECTIONS.filter((s) => {
      const name = s.section_name.toUpperCase();
      return (
        name === trimmed ||
        name === `${trimmed}1` ||
        name === `${trimmed}2` ||
        name === `${trimmed}_1` ||
        name === `${trimmed}_2` ||
        name === `${trimmed}_L` ||
        name === `${trimmed}-L` ||
        name.startsWith(`${trimmed}_`) ||
        name.startsWith(`${trimmed}-`) ||
        name.startsWith(trimmed)
      );
    });

    // Filter to batch-eligible courses if eligibleCourses are provided
    const eligibleCourseIds = new Set(eligibleCourses.map((c) => c.id));
    const batchMatchingSections = matchingSections.filter((s) =>
      eligibleCourseIds.has(s.course_id)
    );
    const targetSections =
      batchMatchingSections.length > 0 ? batchMatchingSections : matchingSections;

    if (targetSections.length > 0) {
      const theorySections = targetSections.filter(
        (s) =>
          !s.section_name.toUpperCase().endsWith("1") &&
          !s.section_name.toUpperCase().endsWith("2") &&
          !s.section_name.toUpperCase().includes("_L") &&
          (s.capacity === 50 || (s.credits ?? 3) >= 3)
      );
      const lab1Sections = targetSections.filter(
        (s) =>
          s.section_name.toUpperCase() === `${trimmed}1` ||
          s.section_name.toUpperCase().endsWith("1") ||
          s.section_name.toUpperCase().includes(`${trimmed}_1`)
      );
      const lab2Sections = targetSections.filter(
        (s) =>
          s.section_name.toUpperCase() === `${trimmed}2` ||
          s.section_name.toUpperCase().endsWith("2") ||
          s.section_name.toUpperCase().includes(`${trimmed}_2`)
      );

      // Theory calculation (fixed capacity = 50 in DIU)
      const theoryAvgCap = 50;
      const theoryEnrolled = theorySections.length > 0
        ? Math.round(
            theorySections.reduce((acc, s) => acc + (s.enrolled_count || 0), 0) /
              theorySections.length
          )
        : 42;
      const theorySeatsFree = Math.max(0, theoryAvgCap - theoryEnrolled);
      const theoryPercent = Math.min(100, Math.round((theoryEnrolled / theoryAvgCap) * 100));

      // Lab 1 calculation (fixed capacity = 25 in DIU)
      const lab1AvgCap = 25;
      const lab1Enrolled = lab1Sections.length > 0
        ? Math.round(
            lab1Sections.reduce((acc, s) => acc + (s.enrolled_count || 0), 0) /
              lab1Sections.length
          )
        : 12;
      const lab1SeatsFree = Math.max(0, lab1AvgCap - lab1Enrolled);
      const lab1Percent = Math.min(100, Math.round((lab1Enrolled / lab1AvgCap) * 100));

      // Lab 2 calculation (fixed capacity = 25 in DIU)
      const lab2AvgCap = 25;
      const lab2Enrolled = lab2Sections.length > 0
        ? Math.round(
            lab2Sections.reduce((acc, s) => acc + (s.enrolled_count || 0), 0) /
              lab2Sections.length
          )
        : 8;
      const lab2SeatsFree = Math.max(0, lab2AvgCap - lab2Enrolled);
      const lab2Percent = Math.min(100, Math.round((lab2Enrolled / lab2AvgCap) * 100));

      // Distinct course grouping
      type RosterItem = {
        id: string;
        code: string;
        title: string;
        isLab: boolean;
        credits: number;
        theorySection?: {
          id: string;
          name: string;
          capacity: number;
          enrolled: number;
          free: number;
        };
        lab1Section?: {
          id: string;
          name: string;
          capacity: number;
          enrolled: number;
          free: number;
        };
        lab2Section?: {
          id: string;
          name: string;
          capacity: number;
          enrolled: number;
          free: number;
        };
      };

      const courseMap = new Map<string, RosterItem>();

      targetSections.forEach((s) => {
        const code = s.course_code || "";
        const isLabCourse =
          s.section_name.toUpperCase().includes("_L") ||
          s.capacity === 25 ||
          (s.credits ?? 1.5) <= 1.5 ||
          (s.course_title || "").toLowerCase().includes("lab");

        if (!courseMap.has(code)) {
          courseMap.set(code, {
            id: s.id,
            code,
            title: s.course_title || "",
            isLab: isLabCourse,
            credits: s.credits ?? (isLabCourse ? 1.5 : 3.0),
          });
        }

        const entry = courseMap.get(code)!;
        const nameUpper = s.section_name.toUpperCase();
        if (isLabCourse) {
          if (nameUpper.endsWith("1") || nameUpper.includes("L1")) {
            entry.lab1Section = {
              id: s.id,
              name: s.section_name,
              capacity: s.capacity,
              enrolled: s.enrolled_count,
              free: Math.max(0, s.capacity - s.enrolled_count),
            };
          } else if (nameUpper.endsWith("2") || nameUpper.includes("L2")) {
            entry.lab2Section = {
              id: s.id,
              name: s.section_name,
              capacity: s.capacity,
              enrolled: s.enrolled_count,
              free: Math.max(0, s.capacity - s.enrolled_count),
            };
          } else {
            entry.lab1Section = {
              id: s.id,
              name: `${trimmed}1`,
              capacity: 25,
              enrolled: s.enrolled_count,
              free: Math.max(0, 25 - s.enrolled_count),
            };
          }
        } else {
          entry.theorySection = {
            id: s.id,
            name: s.section_name,
            capacity: s.capacity,
            enrolled: s.enrolled_count,
            free: Math.max(0, s.capacity - s.enrolled_count),
          };
        }
      });

      // Ensure lab courses have both subgroups defined for toggle display
      courseMap.forEach((entry) => {
        if (entry.isLab) {
          if (!entry.lab1Section) {
            entry.lab1Section = {
              id: `sec-${entry.code.toLowerCase()}-${trimmed.toLowerCase()}1`,
              name: `${trimmed}1`,
              capacity: 25,
              enrolled: 12,
              free: 13,
            };
          }
          if (!entry.lab2Section) {
            entry.lab2Section = {
              id: `sec-${entry.code.toLowerCase()}-${trimmed.toLowerCase()}2`,
              name: `${trimmed}2`,
              capacity: 25,
              enrolled: 8,
              free: 17,
            };
          }
        }
      });

      const distinctCourses = Array.from(courseMap.values());

      return {
        sectionName: trimmed,
        cohortLetter,
        matchingCount: distinctCourses.length,
        theory: {
          capacity: theoryAvgCap,
          enrolled: theoryEnrolled,
          free: theorySeatsFree,
          percent: theoryPercent,
        },
        lab1: {
          capacity: lab1AvgCap,
          enrolled: lab1Enrolled,
          free: lab1SeatsFree,
          percent: lab1Percent,
        },
        lab2: {
          capacity: lab2AvgCap,
          enrolled: lab2Enrolled,
          free: lab2SeatsFree,
          percent: lab2Percent,
        },
        totalSeatsFree: theorySeatsFree + lab1SeatsFree + lab2SeatsFree,
        overallPercent: Math.round(
          ((theoryEnrolled + lab1Enrolled + lab2Enrolled) / (theoryAvgCap + lab1AvgCap + lab2AvgCap)) * 100
        ),
        courses: distinctCourses,
      };
    }

    // Default baseline for newly typed cohort not in pre-seeded mock sections
    // Still adheres strictly to DIU rules: 50 seats for theory, 25 for lab D1 & D2
    return {
      sectionName: trimmed,
      cohortLetter,
      matchingCount: 6,
      theory: {
        capacity: 50,
        enrolled: 42,
        free: 8,
        percent: 84,
      },
      lab1: {
        capacity: 25,
        enrolled: 14,
        free: 11,
        percent: 56,
      },
      lab2: {
        capacity: 25,
        enrolled: 9,
        free: 16,
        percent: 36,
      },
      totalSeatsFree: 35,
      overallPercent: 65,
      courses: [
        {
          id: "c-cse110",
          code: "CSE110",
          title: "Structured Programming Language",
          isLab: false,
          credits: 3.0,
          theorySection: { id: "s-cse110", name: trimmed, capacity: 50, enrolled: 44, free: 6 },
        },
        {
          id: "c-cse111",
          code: "CSE111",
          title: "Structured Programming Language Lab",
          isLab: true,
          credits: 1.5,
          lab1Section: { id: "s-cse111-1", name: `${trimmed}1`, capacity: 25, enrolled: 12, free: 13 },
          lab2Section: { id: "s-cse111-2", name: `${trimmed}2`, capacity: 25, enrolled: 8, free: 17 },
        },
        {
          id: "c-mat101",
          code: "MAT101",
          title: "Differential and Integral Calculus",
          isLab: false,
          credits: 3.0,
          theorySection: { id: "s-mat101", name: trimmed, capacity: 50, enrolled: 42, free: 8 },
        },
        {
          id: "c-eng101",
          code: "ENG101",
          title: "Basic English Language Skills",
          isLab: false,
          credits: 3.0,
          theorySection: { id: "s-eng101", name: trimmed, capacity: 50, enrolled: 48, free: 2 },
        },
        {
          id: "c-phy111",
          code: "PHY111",
          title: "Physics: Mechanics, Waves and Optics",
          isLab: false,
          credits: 3.0,
          theorySection: { id: "s-phy111", name: trimmed, capacity: 50, enrolled: 39, free: 11 },
        },
        {
          id: "c-cse123",
          code: "CSE123",
          title: "Data Structures Lab",
          isLab: true,
          credits: 1.5,
          lab1Section: { id: "s-cse123-1", name: `${trimmed}1`, capacity: 25, enrolled: 11, free: 14 },
          lab2Section: { id: "s-cse123-2", name: `${trimmed}2`, capacity: 25, enrolled: 9, free: 16 },
        },
      ],
    };
  }, [desiredSection, eligibleCourses, cohortLetter]);

  // Search State: Single prominent search field, debounced
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "warning" } | null>(null);

  // Debounce search input (150ms for snappy response)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Available sections lookup helper
  const getCourseSections = React.useCallback((courseId: string) => {
    return MOCK_SECTIONS.filter((s) => s.course_id === courseId);
  }, []);

  // Step 2: Selected Courses Cart
  const [selectedCourses, setSelectedCourses] = React.useState<SelectedCourseItem[]>(() => {
    if (initialActiveRegistration?.courses && initialActiveRegistration.courses.length > 0) {
      return initialActiveRegistration.courses.map((c) => {
        const co = eligibleCourses.find((item) => item.code === c.courseCode) || eligibleCourses[0];
        const sec = MOCK_SECTIONS.find((item) => item.id === c.sectionId) || MOCK_SECTIONS[0];
        return {
          course: co,
          section: sec,
          courseType: c.courseType || "general",
        };
      });
    }

    // Default initial enrollment selected from eligible batch courses
    const items: SelectedCourseItem[] = [];
    const seedEligible = eligibleCourses.slice(0, 3);
    seedEligible.forEach((co) => {
      const available = getCourseSections(co.id);
      const isLab = co.title.toLowerCase().includes("lab") || (co.credits ?? 1.5) <= 1.5;
      const targetSubgroupName = `69_D1`;
      const sec =
        (isLab ? available.find((s) => s.section_name.toUpperCase() === targetSubgroupName) : null) ||
        available.find((s) => s.section_name.includes("69_D") || s.section_name.includes("60_A")) ||
        available[0] ||
        MOCK_SECTIONS[0];
      items.push({
        course: co,
        section: sec,
        courseType: "general",
      });
    });

    return items;
  });

  // Select lab subgroup ("1" or "2") and sync existing selected lab courses
  const handleSelectLabSubgroup = (subgroup: "1" | "2") => {
    setPreferredLabSubgroup(subgroup);
    setSelectedCourses((prev) =>
      prev.map((item) => {
        const isLab =
          item.course.title.toLowerCase().includes("lab") ||
          (item.course.credits ?? 1.5) <= 1.5 ||
          item.section.capacity === 25;
        if (!isLab) return item;

        const available = getCourseSections(item.course.id);
        const targetSubgroupName = `${desiredSection.trim()}${subgroup}`.toUpperCase();
        const matched =
          available.find((s) => s.section_name.toUpperCase() === targetSubgroupName) ||
          available.find((s) => s.section_name.toUpperCase().endsWith(subgroup));
        if (matched) {
          return { ...item, section: matched };
        }
        return item;
      })
    );
  };

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

  // Manual payment declaration state (manually marked paid by student)
  const [isPaid, setIsPaid] = React.useState(true);

  // Credit calculation
  const totalCredits = React.useMemo(() => {
    return selectedCourses.reduce((sum, item) => sum + (item.section.credits || item.course.credits || 3.0), 0);
  }, [selectedCourses]);

  const maxAllowedCredits = 15.0; // Standard DIU undergraduate term cap
  const remainingCredits = Math.max(0, maxAllowedCredits - totalCredits);
  const isCreditOverload = totalCredits > maxAllowedCredits;

  const generalCourseCount = React.useMemo(() => {
    return selectedCourses.filter((c) => c.courseType === "general").length;
  }, [selectedCourses]);

  const retakeCourseCount = React.useMemo(() => {
    return selectedCourses.filter((c) => c.courseType === "retake").length;
  }, [selectedCourses]);

  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = React.useState<string>("all");

  // Filter ONLY against the student's eligible batch courses (normalizing hyphens/spaces)
  const filteredCourses = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase().replace(/[-\s]+/g, "");
    return eligibleCourses.filter((course) => {
      const cat = (course as { category?: string }).category || "CORE";
      const spec = (course as { specialization_group?: string | null }).specialization_group || "";
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;
      if (specializationFilter !== "all" && spec !== specializationFilter) return false;
      if (!q) return true;
      const codeNorm = course.code.toLowerCase().replace(/[-\s]+/g, "");
      const titleNorm = course.title.toLowerCase().replace(/[-\s]+/g, "");
      return codeNorm.includes(q) || titleNorm.includes(q);
    });
  }, [debouncedSearch, eligibleCourses, categoryFilter, specializationFilter]);

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

  // Add Course to Selection (guarantees no duplicates)
  const handleAddCourse = (course: ExtendedCourse) => {
    const alreadySelected = selectedCourses.some((c) => c.course.id === course.id);
    if (alreadySelected) {
      setFeedback({
        text: `${course.code} is already in your registration selection.`,
        type: "warning",
      });
      return;
    }

    const available = getCourseSections(course.id);
    const isLab = course.title.toLowerCase().includes("lab") || (course.credits ?? 1.5) <= 1.5;
    const targetSubgroupName = `${desiredSection.trim()}${preferredLabSubgroup}`.toUpperCase();
    const targetSection =
      (isLab
        ? available.find((s) => s.section_name.toUpperCase() === targetSubgroupName) ||
          available.find((s) => s.section_name.toUpperCase().endsWith(preferredLabSubgroup))
        : null) ||
      available.find((s) => s.section_name.toLowerCase().includes(desiredSection.trim().toLowerCase())) ||
      available[0];

    if (!targetSection) {
      setFeedback({
        text: `No active sections currently scheduled for ${course.code}.`,
        type: "warning",
      });
      return;
    }

    const courseCredits = targetSection.credits || course.credits || 3.0;
    if (totalCredits + courseCredits > maxAllowedCredits) {
      setFeedback({
        text: `Credit limit warning: Total load would reach ${(totalCredits + courseCredits).toFixed(1)} Cr (maximum cap: ${maxAllowedCredits} Cr).`,
        type: "warning",
      });
    }

    setSelectedCourses((prev) => [
      ...prev,
      {
        course,
        section: targetSection,
        courseType: "general", // Defaults to general
      },
    ]);

    setFeedback({
      text: `Added ${course.code} (Section ${targetSection.section_name}) as General course.`,
      type: "success",
    });
  };

  // Remove Course from Selection
  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.course.id !== courseId));
  };

  // Switch section for a selected course
  const handleSectionChange = (courseId: string, newSectionId: string) => {
    const newSection = MOCK_SECTIONS.find((s) => s.id === newSectionId);
    if (!newSection) return;

    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.course.id === courseId ? { ...item, section: newSection } : item
      )
    );
  };

  // Independent General / Retake classification per course
  const handleSetClassification = (courseId: string, courseType: "general" | "retake") => {
    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.course.id === courseId ? { ...item, courseType } : item
      )
    );
  };

  // Final Application Submission
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
        isPaid,
      };

      const result = await submitStudentRegistration(payload);

      if (!result.success) {
        setIsSubmitting(false);
        setSubmitError(result.error || "Failed to submit course registration application.");
        return;
      }

      setIsSubmitting(false);
      setSubmittedData({
        registrationId: result.registrationId || `reg-app-${Date.now()}`,
        referenceId: result.referenceId || `REG-2027-SP-${Math.floor(1000 + Math.random() * 9000)}`,
        submittedAt: result.submittedAt || new Date().toISOString(),
      });
      setCurrentStep(4);
    } catch {
      setIsSubmitting(false);
      setSubmitError("Network or server communication error. Please try again.");
    }
  };

  // Payment Status Badge Component (Student manual payment status)
  const renderPaymentBadge = () => {
    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Payment: Paid</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-medium">
        <Clock className="h-3.5 w-3.5 text-amber-400" />
        <span>Payment: Unpaid</span>
      </span>
    );
  };

  // Interactive Stepper
  const renderStepper = () => {
    const steps = [
      { num: 1, title: "Section Info", desc: `${previousSection || "—"} → ${desiredSection || "—"}` },
      { num: 2, title: "Course Selection", desc: `${selectedCourses.length} Courses • ${totalCredits.toFixed(1)} Cr` },
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
      {/* TOP HEADER: University Administration Workspace */}
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Course Registration Workspace
            </h1>
            <span className="text-xs font-mono font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/80">
              {activeSemesterName}
            </span>
            <span className="text-xs font-mono font-medium text-sky-400 px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-800/80">
              Batch {studentBatch}
            </span>
          </div>
          <p className="text-xs text-[#8e9db2]">
            Daffodil International University • Window: {ACTIVE_MOCK_REGISTRATION_WINDOW}
          </p>
        </div>

        {/* Right side: Payment status and Dashboard Link */}
        <div className="flex flex-wrap items-center gap-3">
          {renderPaymentBadge()}
          <Link
            href="/dashboard"
            className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-[#1c263c] hover:bg-[#1a233a]"
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
      {/* STEP 1: ACADEMIC SECTION DETAILS & LIVE DESIRED SECTION SEAT CAPACITY     */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="max-w-4xl mx-auto py-2 pb-12 space-y-6">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
            {/* Header: Institutional Context & Student Identification */}
            <div className="border-b border-[#1c263c] pb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#172136] border border-[#25324d] text-sky-400 text-xs font-medium">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Step 1 of 3 • Section Routing & Cohort Allocation</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-[#8e9db2]">Student ID:</span>
                  <span className="font-bold text-white bg-[#0b0f19] px-2.5 py-0.5 rounded border border-[#1c263c]">
                    {profile.diu_id || "211-15-456"}
                  </span>
                  <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80">
                    Batch {detectedBatch}
                  </span>
                  <span className="text-slate-400 font-medium px-2 py-0.5 rounded bg-[#172136] border border-[#25324d]">
                    {profile.department_code || "CSE"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Academic Section Details</span>
                </h2>
                <p className="text-xs text-[#8e9db2] leading-relaxed max-w-2xl">
                  Specify your completed previous semester section cohort and your desired class section for{" "}
                  <strong className="text-slate-200 font-semibold">{activeSemesterName}</strong>.
                  Your section choice determines your daily timetable routine, classroom assignments, and ensures conflict-free class hours.
                </p>
              </div>
            </div>

            {sectionError && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="font-medium">{sectionError}</span>
              </div>
            )}

            {/* Dual Column Form: Previous Section & Desired Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CARD 1: Previous Enrolled Section */}
              <div className="bg-[#0b0f19] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#172136] border border-[#25324d] flex items-center justify-center text-slate-300">
                        <Clock className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white">
                          Previous Enrolled Section <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[11px] text-[#8e9db2]">Preceding semester cohort</span>
                      </div>
                    </div>
                    {previousSection.trim() && (
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        ✓ Recorded
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={previousSection}
                      onChange={(e) => setPreviousSection(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      placeholder="e.g. 69_K"
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wide bg-[#121827] border border-[#1c263c] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Quick suggestions for previous section */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Quick Select Previous Cohort:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previousSectionSuggestions.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setPreviousSection(sec)}
                          className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-all ${
                            previousSection.trim() === sec
                              ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                              : "bg-[#121827] hover:bg-[#172136] text-slate-300 border-[#1c263c]"
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#121827]/70 border border-[#1c263c] text-[11px] text-[#8e9db2] leading-relaxed">
                  <strong className="text-slate-300">DIU Academic Record Rule:</strong> Used by your academic advisor to verify prerequisite courses passed in your previous term.
                </div>
              </div>

              {/* CARD 2: Desired Section for Active Semester */}
              <div className="bg-[#0b0f19] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#172136] border border-[#25324d] flex items-center justify-center text-sky-400">
                        <Layers className="h-4 w-4 text-sky-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white">
                          Desired Section for {activeSemesterName} <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[11px] text-[#8e9db2]">Preferred class routine cohort</span>
                      </div>
                    </div>
                    {desiredSection.trim() && (
                      <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded-full">
                        Target: {desiredSection}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={desiredSection}
                      onChange={(e) => setDesiredSection(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      placeholder="e.g. 69_D"
                      className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-wide bg-[#121827] border border-[#1c263c] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all"
                    />
                  </div>

                  {/* Quick suggestions for desired section */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Quick Select Batch {detectedBatch} Sections:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {batchCohortSuggestions.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setDesiredSection(sec)}
                          className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-all ${
                            desiredSection.trim() === sec
                              ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                              : "bg-[#121827] hover:bg-[#172136] text-slate-300 border-[#1c263c]"
                          }`}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#121827]/70 border border-[#1c263c] text-[11px] text-[#8e9db2] leading-relaxed">
                  <strong className="text-slate-300">Routine Guarantee:</strong> Choosing courses belonging to Section <strong>{desiredSection || "69_D"}</strong> ensures zero routine clash during semester classes.
                </div>
              </div>
            </div>

            {/* Laboratory Subgroup Option (Lab D1 vs Lab D2) */}
            <div className="bg-[#0b0f19] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#1c263c]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
                    <FlaskConical className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-semibold text-white">
                        Laboratory Subgroup Selection for Section {desiredSection || "69_D"}
                      </label>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.2 rounded-full font-semibold">
                        D1: 25 Seats + D2: 25 Seats = 50 Total
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8e9db2]">
                      For the same course, <strong>Lab {cohortLetter}1 contains 25 students</strong> and <strong>Lab {cohortLetter}2 contains 25 students</strong> (together accommodating all 50 theory students).
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-medium text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  Active: Lab {cohortLetter}{preferredLabSubgroup}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Subgroup 1 Option Card */}
                <button
                  type="button"
                  onClick={() => handleSelectLabSubgroup("1")}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    preferredLabSubgroup === "1"
                      ? "bg-purple-950/30 border-purple-500 shadow-xs ring-1 ring-purple-500/50"
                      : "bg-[#121827] border-[#1c263c] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          preferredLabSubgroup === "1"
                            ? "border-purple-400 bg-purple-500 text-white"
                            : "border-slate-600 bg-transparent"
                        }`}
                      >
                        {preferredLabSubgroup === "1" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </span>
                      <span className="text-sm font-bold font-mono text-white">
                        Lab {cohortLetter}1
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({desiredSection.trim() || "69_D"}1)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {desiredSectionStats?.lab1?.free ?? 13} Seats Free
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#8e9db2] flex items-center justify-between">
                    <span>Contains 25 Students • 1st Subgroup</span>
                    <span className="font-mono text-slate-300">
                      {desiredSectionStats?.lab1?.enrolled ?? 12} / 25 Enrolled
                    </span>
                  </div>
                </button>

                {/* Subgroup 2 Option Card */}
                <button
                  type="button"
                  onClick={() => handleSelectLabSubgroup("2")}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    preferredLabSubgroup === "2"
                      ? "bg-purple-950/30 border-purple-500 shadow-xs ring-1 ring-purple-500/50"
                      : "bg-[#121827] border-[#1c263c] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          preferredLabSubgroup === "2"
                            ? "border-purple-400 bg-purple-500 text-white"
                            : "border-slate-600 bg-transparent"
                        }`}
                      >
                        {preferredLabSubgroup === "2" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </span>
                      <span className="text-sm font-bold font-mono text-white">
                        Lab {cohortLetter}2
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({desiredSection.trim() || "69_D"}2)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {desiredSectionStats?.lab2?.free ?? 17} Seats Free
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#8e9db2] flex items-center justify-between">
                    <span>Contains 25 Students • 2nd Subgroup</span>
                    <span className="font-mono text-slate-300">
                      {desiredSectionStats?.lab2?.enrolled ?? 8} / 25 Enrolled
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* LIVE DESIRED SECTION SEAT CAPACITY DISPLAY (RIGHT DOWN UNDERNEATH)        */}
            {/* ========================================================================= */}
            {desiredSection.trim() && desiredSectionStats ? (
              <div className="bg-[#080c14] border border-[#1e293b] rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                {/* Header: Section Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c263c]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Section {desiredSectionStats.sectionName} Seat Availability</span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          ({activeSemesterName})
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#8e9db2]">
                        Live institutional enrollment counts & seat allocation rules
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <div className="flex items-center gap-2">
                    {desiredSectionStats.totalSeatsFree > 5 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Open for Enrollment ({desiredSectionStats.totalSeatsFree} Seats Free)</span>
                      </span>
                    ) : desiredSectionStats.totalSeatsFree > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono font-medium">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>High Demand ({desiredSectionStats.totalSeatsFree} Seats Left)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono font-medium">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span>Section Full (Waitlist Only)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Triple Seat Metric Cards: Theory (50 Cap), Lab 1 (Contains 25), Lab 2 (Contains 25) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Metric 1: Theory Lectures (50 Fixed Cap) */}
                  <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-[#1e293b] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                        <span>Theory Courses (Fixed 50 Cap)</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                        {desiredSectionStats.theory.free} Seats Free
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-2xl font-bold font-mono text-white">
                        {desiredSectionStats.theory.enrolled}
                        <span className="text-sm font-normal text-slate-400 ml-1">/ 50 Enrolled</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {desiredSectionStats.theory.percent}% Occupied
                      </span>
                    </div>

                    <Progress
                      value={desiredSectionStats.theory.percent}
                      className={`h-2 ${
                        desiredSectionStats.theory.percent >= 96
                          ? "[&>div]:bg-rose-500"
                          : desiredSectionStats.theory.percent >= 80
                          ? "[&>div]:bg-amber-400"
                          : "[&>div]:bg-[#008764]"
                      }`}
                    />

                    <p className="text-[10px] text-[#8e9db2] pt-0.5">
                      Section {desiredSectionStats.sectionName} lecture cohort (50 seats cap).
                    </p>
                  </div>

                  {/* Metric 2: Lab Subgroup 1 (Contains 25 Students) */}
                  <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                    preferredLabSubgroup === "1"
                      ? "bg-[#131b2e] border-purple-500/70 ring-1 ring-purple-500/40"
                      : "bg-[#0f172a]/60 border-[#1e293b]"
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
                        <span>Lab {desiredSectionStats.cohortLetter}1 (Contains 25)</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                        {desiredSectionStats.lab1.free} Seats Free
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-2xl font-bold font-mono text-white">
                        {desiredSectionStats.lab1.enrolled}
                        <span className="text-sm font-normal text-slate-400 ml-1">/ 25 Enrolled</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {desiredSectionStats.lab1.percent}% Occupied
                      </span>
                    </div>

                    <Progress
                      value={desiredSectionStats.lab1.percent}
                      className={`h-2 ${
                        desiredSectionStats.lab1.percent >= 96
                          ? "[&>div]:bg-rose-500"
                          : desiredSectionStats.lab1.percent >= 80
                          ? "[&>div]:bg-amber-400"
                          : "[&>div]:bg-purple-500"
                      }`}
                    />

                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className="text-[#8e9db2]">Section {desiredSectionStats.sectionName}1 (25 Cap)</span>
                      {preferredLabSubgroup === "1" ? (
                        <span className="font-mono font-semibold text-purple-300">✓ Active Selection</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectLabSubgroup("1")}
                          className="font-mono text-slate-400 hover:text-purple-300 underline cursor-pointer"
                        >
                          Select Lab {desiredSectionStats.cohortLetter}1
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metric 3: Lab Subgroup 2 (Contains 25 Students) */}
                  <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                    preferredLabSubgroup === "2"
                      ? "bg-[#131b2e] border-purple-500/70 ring-1 ring-purple-500/40"
                      : "bg-[#0f172a]/60 border-[#1e293b]"
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                        <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
                        <span>Lab {desiredSectionStats.cohortLetter}2 (Contains 25)</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                        {desiredSectionStats.lab2.free} Seats Free
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-2xl font-bold font-mono text-white">
                        {desiredSectionStats.lab2.enrolled}
                        <span className="text-sm font-normal text-slate-400 ml-1">/ 25 Enrolled</span>
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {desiredSectionStats.lab2.percent}% Occupied
                      </span>
                    </div>

                    <Progress
                      value={desiredSectionStats.lab2.percent}
                      className={`h-2 ${
                        desiredSectionStats.lab2.percent >= 96
                          ? "[&>div]:bg-rose-500"
                          : desiredSectionStats.lab2.percent >= 80
                          ? "[&>div]:bg-amber-400"
                          : "[&>div]:bg-purple-500"
                      }`}
                    />

                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className="text-[#8e9db2]">Section {desiredSectionStats.sectionName}2 (25 Cap)</span>
                      {preferredLabSubgroup === "2" ? (
                        <span className="font-mono font-semibold text-purple-300">✓ Active Selection</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectLabSubgroup("2")}
                          className="font-mono text-slate-400 hover:text-purple-300 underline cursor-pointer"
                        >
                          Select Lab {desiredSectionStats.cohortLetter}2
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanatory Banner: Same Course Lab Subgroups (25 + 25 = 50) */}
                <div className="p-3 rounded-lg bg-[#0f172a]/70 border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    <span>
                      <strong className="text-white">Same Course Allocation:</strong> For each lab course, <strong>Lab {desiredSectionStats.cohortLetter}1 contains 25 students</strong> and <strong>Lab {desiredSectionStats.cohortLetter}2 contains 25 students</strong>.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0 self-start sm:self-auto">
                    <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                      D1: 25 Seats
                    </span>
                    <span className="text-slate-500">+</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                      D2: 25 Seats
                    </span>
                    <span className="text-slate-500">=</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                      50 Total Seats
                    </span>
                  </div>
                </div>

                {/* Course-by-Course Roster Breakdown */}
                {desiredSectionStats.courses.length > 0 && (
                  <div className="pt-2 border-t border-[#1c263c] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowSectionRoster((v) => !v)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Scheduled Courses for Section {desiredSectionStats.sectionName}</span>
                        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.2 rounded-full border border-sky-800/60">
                          {desiredSectionStats.courses.length} Courses
                        </span>
                        {showSectionRoster ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {showSectionRoster ? "Click to collapse" : "Click to view courses & seats"}
                      </span>
                    </div>

                    {showSectionRoster && (
                      <div className="border border-[#1c263c] rounded-lg overflow-hidden bg-[#0b0f19] max-h-[340px] overflow-y-auto animate-in fade-in">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#121827] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1c263c]">
                            <tr>
                              <th className="py-2.5 px-3">Course</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Section / Lab Subgroup Option</th>
                              <th className="py-2.5 px-3">Enrolled</th>
                              <th className="py-2.5 px-3 text-right">Available Seats</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1c263c]">
                            {desiredSectionStats.courses.map((c) => {
                              const activeLab = preferredLabSubgroup === "1" ? c.lab1Section : c.lab2Section;
                                                            const freeCount = c.isLab
                                ? activeLab?.free ?? 13
                                : c.theorySection?.free ?? 8;

                              return (
                                <tr key={c.id} className="hover:bg-[#121827]/40 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-white">{c.code}</span>
                                      <span className="text-[11px] text-[#8e9db2] truncate max-w-[170px] sm:max-w-xs">
                                        {c.title}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {c.isLab ? (
                                      <div className="space-y-0.5">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 inline-block">
                                          Lab (50 Cap)
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 block">
                                          D1: 25 • D2: 25
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800 inline-block">
                                        Theory (50 Cap)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {c.isLab ? (
                                      <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleSelectLabSubgroup("1")}
                                            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                                              preferredLabSubgroup === "1"
                                                ? "bg-purple-900/90 text-purple-200 border-purple-500 shadow-xs ring-1 ring-purple-500/50"
                                                : "bg-[#121827] text-slate-400 border-[#1c263c] hover:text-slate-200"
                                            }`}
                                            title={`Select Lab ${desiredSectionStats.cohortLetter}1 (Contains 25 students, ${c.lab1Section?.free ?? 13} seats free)`}
                                          >
                                            {preferredLabSubgroup === "1" ? "✓ " : ""}Lab {desiredSectionStats.cohortLetter}1
                                            <span className="text-[10px] ml-1 opacity-80">(25 seats)</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSelectLabSubgroup("2")}
                                            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                                              preferredLabSubgroup === "2"
                                                ? "bg-purple-900/90 text-purple-200 border-purple-500 shadow-xs ring-1 ring-purple-500/50"
                                                : "bg-[#121827] text-slate-400 border-[#1c263c] hover:text-slate-200"
                                            }`}
                                            title={`Select Lab ${desiredSectionStats.cohortLetter}2 (Contains 25 students, ${c.lab2Section?.free ?? 17} seats free)`}
                                          >
                                            {preferredLabSubgroup === "2" ? "✓ " : ""}Lab {desiredSectionStats.cohortLetter}2
                                            <span className="text-[10px] ml-1 opacity-80">(25 seats)</span>
                                          </button>
                                        </div>
                                        <span className="text-[10px] text-[#8e9db2] block">
                                          Same course • 25 in D1 + 25 in D2
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-mono text-slate-300 text-xs px-2.5 py-1 rounded bg-[#121827] border border-[#1c263c] inline-block">
                                        Section {desiredSectionStats.sectionName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-200">
                                    {c.isLab ? (
                                      <div className="text-xs space-y-1">
                                        <div
                                          className={`flex items-center justify-between gap-2 px-1.5 py-0.5 rounded ${
                                            preferredLabSubgroup === "1"
                                              ? "bg-purple-950/70 text-purple-200 font-bold border border-purple-800/80"
                                              : "text-slate-400"
                                          }`}
                                        >
                                          <span>D1:</span>
                                          <span>
                                            {c.lab1Section?.enrolled ?? 12} / 25
                                            {preferredLabSubgroup === "1" && " ●"}
                                          </span>
                                        </div>
                                        <div
                                          className={`flex items-center justify-between gap-2 px-1.5 py-0.5 rounded ${
                                            preferredLabSubgroup === "2"
                                              ? "bg-purple-950/70 text-purple-200 font-bold border border-purple-800/80"
                                              : "text-slate-400"
                                          }`}
                                        >
                                          <span>D2:</span>
                                          <span>
                                            {c.lab2Section?.enrolled ?? 8} / 25
                                            {preferredLabSubgroup === "2" && " ●"}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 pt-0.5 flex justify-between border-t border-[#1c263c]/60">
                                          <span>Combined:</span>
                                          <span className="text-slate-200 font-semibold">
                                            {(c.lab1Section?.enrolled ?? 12) + (c.lab2Section?.enrolled ?? 8)} / 50
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs">{c.theorySection?.enrolled ?? 42} / 50</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {c.isLab ? (
                                      <div className="font-mono text-xs space-y-1">
                                        <div
                                          className={`flex items-center justify-end gap-1.5 ${
                                            preferredLabSubgroup === "1" ? "text-emerald-300 font-bold" : "text-slate-400"
                                          }`}
                                        >
                                          <span className="text-[10px]">D1:</span>
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                                            {c.lab1Section?.free ?? 13} free
                                          </span>
                                        </div>
                                        <div
                                          className={`flex items-center justify-end gap-1.5 ${
                                            preferredLabSubgroup === "2" ? "text-emerald-300 font-bold" : "text-slate-400"
                                          }`}
                                        >
                                          <span className="text-[10px]">D2:</span>
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                                            {c.lab2Section?.free ?? 17} free
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 pt-0.5 border-t border-[#1c263c]/60">
                                          <span className="text-emerald-400 font-semibold">
                                            {(c.lab1Section?.free ?? 13) + (c.lab2Section?.free ?? 17)} free total
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span
                                        className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                                          freeCount > 5
                                            ? "text-emerald-400 bg-emerald-950/60"
                                            : freeCount > 0
                                            ? "text-amber-400 bg-amber-950/60"
                                            : "text-rose-400 bg-rose-950/60"
                                        }`}
                                      >
                                        {freeCount > 0 ? `${freeCount} free` : "Full"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] text-center text-xs text-[#8e9db2] space-y-1">
                <Info className="h-4 w-4 text-slate-500 mx-auto" />
                <p>Type your desired section or choose from the suggested batch cohorts above to inspect live seat availability.</p>
              </div>
            )}

            {/* Explanatory Policy Callout */}
            <div className="p-4 rounded-xl bg-[#172136] border border-[#25324d] flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span className="font-semibold text-white block">DIU Academic Council Registration Rules:</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px] text-[#8e9db2]">
                  <div className="p-2 rounded-lg bg-[#121827]/80 border border-[#1c263c]">
                    <strong className="text-slate-200 block mb-0.5">1. Fixed Class Seat Limits</strong>
                    50 seats for Theory lectures; 25 seats for Laboratories. No over-enrollment permitted.
                  </div>
                  <div className="p-2 rounded-lg bg-[#121827]/80 border border-[#1c263c]">
                    <strong className="text-slate-200 block mb-0.5">2. Clash-Free Timetable</strong>
                    Selecting Section {desiredSection || "69_D"} aligns your weekly class routine without time conflicts.
                  </div>
                  <div className="p-2 rounded-lg bg-[#121827]/80 border border-[#1c263c]">
                    <strong className="text-slate-200 block mb-0.5">3. Advisor Endorsement</strong>
                    Your submitted course selection is reviewed and approved by your assigned faculty advisor.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1c263c]">
              <Link
                href="/dashboard"
                className="text-xs text-[#8e9db2] hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Cancel & Return to Dashboard</span>
              </Link>

              <Button
                onClick={handleProceedFromSections}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs px-6 h-9 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Course Selection</span>
                <ArrowRight className="h-4 w-4 text-[#0b0f19]" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: COURSE SELECTION & CLASSIFICATION (Clean Workspace)               */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Area: Search & Eligible Course List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Cohort Bar */}
            <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#8e9db2]">Enrolled Cohort:</span>
                <span className="font-mono text-emerald-400 font-bold bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1c263c]">
                  Prev: {previousSection}
                </span>
                <span className="text-slate-600">&rarr;</span>
                <span className="font-mono text-sky-400 font-bold bg-[#0b0f19] px-2 py-0.5 rounded border border-[#1c263c]">
                  Desired: {desiredSection}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
                  • Configured for Batch {studentBatch}
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

            {/* SINGLE PROMINENT COURSE SEARCH (No department or level dropdowns) */}
            <div className="p-3.5 rounded-xl border border-[#1c263c] bg-[#121827] space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`Search eligible courses for Batch ${studentBatch} by code or title (e.g. CSE110, Data Structures)...`}
                  className="w-full pl-10 pr-9 py-2 text-xs bg-[#0b0f19] border border-[#1c263c] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs p-0.5"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter courses by category"
                  className="h-8 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-2.5 text-xs text-slate-200"
                >
                  <option value="all">All Categories</option>
                  {COURSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                {eligibleCourses.some((c) => Boolean((c as { specialization_group?: string | null }).specialization_group)) && (
                  <select
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                    aria-label="Filter courses by specialization"
                    className="h-8 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-2.5 text-xs text-slate-200"
                  >
                    <option value="all">All Specializations</option>
                    {SPECIALIZATION_GROUPS.map((s) => (
                      <option key={s} value={s}>
                        {SPECIALIZATION_LABELS[s]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8e9db2] px-0.5">
                <span>
                  Showing <strong>{filteredCourses.length}</strong> eligible course{filteredCourses.length !== 1 ? "s" : ""} configured for Batch {studentBatch} in {activeSemesterName}
                </span>
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="text-blue-400 hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>

            {/* Available Course List */}
            <div className="space-y-3">
              {filteredCourses.length === 0 ? (
                <div className="p-10 text-center bg-[#121827] border border-[#1c263c] rounded-xl space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">
                    No courses match your query
                  </div>
                  <p className="text-xs text-[#8e9db2] max-w-sm mx-auto">
                    Only courses configured for <strong>Batch {studentBatch}</strong> in <strong>{activeSemesterName}</strong> are displayed.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearchInput("")}
                    className="text-xs mt-2 border-[#1c263c]"
                  >
                    Reset Search
                  </Button>
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const selectedItem = selectedCourses.find((c) => c.course.id === course.id);
                  const isSelected = Boolean(selectedItem);
                  const availableSections = getCourseSections(course.id);
                  const isLab = course.title.toLowerCase().includes("lab") || course.credits <= 1.5;
                  const capacityCap = isLab ? 25 : 50;

                  return (
                    <div
                      key={course.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[#141d30] border-blue-600/70 shadow-xs"
                          : "bg-[#121827] border-[#1c263c] hover:border-slate-700"
                      }`}
                    >
                      {/* Top Row: Course Code, Title, Credits & Add/Selected Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-[#0b0f19] border border-[#1c263c]">
                              {course.code}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {course.title}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {course.credits.toFixed(1)} Credits
                            </span>
                          </div>

                          <div className="text-[11px] text-[#8e9db2] flex flex-wrap items-center gap-2">
                            {isLab ? (
                              <span className="font-mono text-purple-300 bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                                Same Course Lab: D1 contains 25 & D2 contains 25 students (50 Total)
                              </span>
                            ) : (
                              <span>
                                {availableSections.length > 0
                                  ? `${availableSections.length} Sections Available (${capacityCap} seats/section)`
                                  : "1 Section Scheduled"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action: Add / Selected */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium">
                                <Check className="h-3.5 w-3.5" />
                                <span>Selected</span>
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveCourse(course.id)}
                                className="h-7 px-2.5 text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/40"
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddCourse(course)}
                              className="h-8 text-xs bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold px-3"
                            >
                              + Add Course
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* When Course is Selected: Individual Section & Classification Controls */}
                      {isSelected && selectedItem && (
                        <div className="mt-3 pt-3 border-t border-[#1c263c] flex flex-wrap items-center justify-between gap-3 text-xs bg-[#0b0f19]/60 p-2.5 rounded-lg">
                          {/* Class Section Selection */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[#8e9db2] font-medium text-[11px]">Class Section:</span>
                            {isLab && availableSections.some((s) => s.section_name.toUpperCase().endsWith("1") || s.section_name.toUpperCase().endsWith("2")) && (
                              <div className="inline-flex rounded-lg bg-[#121827] p-0.5 border border-[#1c263c]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const s1 = availableSections.find((s) => s.section_name.toUpperCase().endsWith("1"));
                                    if (s1) handleSectionChange(course.id, s1.id);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                                    selectedItem.section.section_name.toUpperCase().endsWith("1")
                                      ? "bg-purple-600 text-white shadow-xs"
                                      : "text-[#8e9db2] hover:text-white"
                                  }`}
                                >
                                  Lab {cohortLetter}1 (25 seats)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const s2 = availableSections.find((s) => s.section_name.toUpperCase().endsWith("2"));
                                    if (s2) handleSectionChange(course.id, s2.id);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                                    selectedItem.section.section_name.toUpperCase().endsWith("2")
                                      ? "bg-purple-600 text-white shadow-xs"
                                      : "text-[#8e9db2] hover:text-white"
                                  }`}
                                >
                                  Lab {cohortLetter}2 (25 seats)
                                </button>
                              </div>
                            )}
                            {availableSections.length > 0 ? (
                              <select
                                value={selectedItem.section.id}
                                onChange={(e) => handleSectionChange(course.id, e.target.value)}
                                className="text-xs font-mono bg-[#121827] border border-[#1c263c] rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {availableSections.map((s) => {
                                  const labBadge = s.section_name.toUpperCase().endsWith("1")
                                    ? ` (Lab ${cohortLetter}1 • 25 seats)`
                                    : s.section_name.toUpperCase().endsWith("2")
                                    ? ` (Lab ${cohortLetter}2 • 25 seats)`
                                    : "";
                                  return (
                                    <option key={s.id} value={s.id}>
                                      Section {s.section_name}{labBadge} ({s.enrolled_count}/{s.capacity} seats)
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <span className="font-mono text-slate-300 text-xs">
                                Section {selectedItem.section.section_name}
                              </span>
                            )}
                          </div>

                          {/* Individual General / Retake Classification (Per Course) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[#8e9db2] font-medium text-[11px]">Classification:</span>
                            <div className="inline-flex rounded-lg bg-[#121827] p-0.5 border border-[#1c263c]">
                              <button
                                type="button"
                                onClick={() => handleSetClassification(course.id, "general")}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
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
                                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                  selectedItem.courseType === "retake"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "text-[#8e9db2] hover:text-white"
                                }`}
                              >
                                Retake
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Registration Summary (4 cols desktop, sticky) */}
          <div className="lg:col-span-4 sticky top-20 space-y-3">
            <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="space-y-1 border-b border-[#1c263c] pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Registration Summary
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {activeSemesterName}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Batch {studentBatch} • {previousSection} &rarr; {desiredSection}
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
                  <span>Remaining: {remainingCredits.toFixed(1)} Cr</span>
                </div>
              </div>

              {/* Selected Course List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {selectedCourses.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No courses added yet. Add courses from the eligible list.
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
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded font-mono ${
                              item.courseType === "general"
                                ? "bg-blue-950 text-blue-300 border border-blue-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {item.courseType.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8e9db2] truncate">
                          {item.course.title}
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

              {/* Payment Status Toggle / Indicator */}
              <div className="p-2.5 rounded-lg bg-[#0b0f19] border border-[#1c263c] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-[#8e9db2]">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Tuition Payment:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaid((p) => !p)}
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                    isPaid
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-amber-950 text-amber-400 border border-amber-800"
                  }`}
                  title="Click to toggle payment status"
                >
                  {isPaid ? "Paid ✓" : "Unpaid"}
                </button>
              </div>

              {/* Classification Breakdown */}
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
                <span>Step 3 of 3 • Final Verification</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Review Course Registration Application
              </h2>
              <p className="text-xs text-[#8e9db2] leading-relaxed">
                Carefully review all academic section assignments, batch-configured courses, and classifications before forwarding to your academic advisor.
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
                  <span className="text-slate-300 font-mono">Batch {studentBatch}</span>
                </div>
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Verified Email:</span>
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
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[#8e9db2] mr-1.5">Previous Enrolled Section:</span>
                    <strong className="font-mono text-emerald-400 bg-[#121827] px-2 py-0.5 rounded border border-[#1c263c]">
                      {previousSection}
                    </strong>
                  </div>
                  <span className="text-slate-500">&rarr;</span>
                  <div>
                    <span className="text-[#8e9db2] mr-1.5">Desired Cohort Section:</span>
                    <strong className="font-mono text-sky-400 bg-[#121827] px-2 py-0.5 rounded border border-[#1c263c]">
                      {desiredSection}
                    </strong>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="text-xs h-7 border-[#1c263c] text-slate-300"
              >
                Change Sections
              </Button>
            </div>

            {/* 3. TUITION PAYMENT STATUS (Manually marked by student after doing payment) */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  3. Tuition Payment Status
                </div>
                <div className="text-xs font-semibold text-white">
                  Have you completed your semester tuition fee payment?
                </div>
                <p className="text-[11px] text-[#8e9db2]">
                  Mark this as paid if you have completed your tuition fee deposit or payment for {activeSemesterName}.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 border transition-all ${
                    isPaid
                      ? "bg-emerald-950/90 border-emerald-600 text-emerald-300 shadow-xs"
                      : "bg-[#121827] border-[#1c263c] text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 ${isPaid ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Mark as Paid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 border transition-all ${
                    !isPaid
                      ? "bg-amber-950/90 border-amber-600 text-amber-300 shadow-xs"
                      : "bg-[#121827] border-[#1c263c] text-slate-400 hover:text-white"
                  }`}
                >
                  <Clock className={`h-3.5 w-3.5 ${!isPaid ? "text-amber-400" : "text-slate-500"}`} />
                  <span>Unpaid</span>
                </button>
              </div>
            </div>

            {/* 4. SELECTED COURSES TABLE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  4. Enrolled Courses ({selectedCourses.length} Courses • {totalCredits.toFixed(1)} Credits)
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs h-7 border-[#1c263c] text-slate-300"
                >
                  Modify Courses
                </Button>
              </div>

              <div className="border border-[#1c263c] rounded-xl overflow-hidden bg-[#0b0f19]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121827] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1c263c]">
                    <tr>
                      <th className="py-2.5 px-3">Course Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3">Credits</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3 text-right">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c263c]">
                    {selectedCourses.map((item) => (
                      <tr key={item.course.id} className="hover:bg-[#121827]/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {item.course.code}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.course.title}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {(item.section.credits || item.course.credits).toFixed(1)} Cr
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sky-400">
                          Section {item.section.section_name}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.courseType === "general"
                                ? "bg-blue-950/80 text-blue-300 border border-blue-800"
                                : "bg-amber-950/80 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {item.courseType.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ADVISOR FORWARDING DISCLAIMER */}
            <div className="p-4 rounded-xl bg-[#172136] border border-[#25324d] space-y-1.5 text-xs">
              <span className="font-semibold text-white block">Advising Submission Commitment:</span>
              <p className="text-slate-300 leading-relaxed">
                By submitting this application, you declare that your requested courses and section cohort
                preferences comply with DIU department regulations. Your academic advisor will review your prerequisite standing
                and confirm section registrations.
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto text-xs border-[#1c263c] text-slate-300"
              >
                &larr; Back to Course Selection
              </Button>

              <Button
                disabled={isSubmitting || isCreditOverload}
                onClick={handleFinalSubmit}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs px-6 h-9 rounded-xl shadow-xs transition-all disabled:opacity-40"
              >
                {isSubmitting ? "Submitting Application..." : "Confirm & Submit Application to Advisor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUBMISSION CONFIRMATION RECEIPT                                   */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
          <div className="bg-[#121827] border border-[#1c263c] rounded-2xl p-6 sm:p-8 space-y-6 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#062822] border border-[#064e3b] flex items-center justify-center mx-auto text-[#10b981]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Course Registration Submitted Successfully
              </h2>
              <p className="text-xs text-[#8e9db2] max-w-md mx-auto leading-relaxed">
                Your advising slip has been recorded and forwarded to your academic advisor for formal review and section confirmation.
              </p>
            </div>

            {/* Metadata Card */}
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#1c263c] text-left space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#1c263c]">
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Application Reference:</span>
                  <strong className="font-mono text-emerald-400">
                    {submittedData?.referenceId || "REG-2027-SP-4589"}
                  </strong>
                </div>
                <div>
                  <span className="text-[#8e9db2] block text-[11px]">Submission Time:</span>
                  <span className="text-slate-300 font-mono">
                    {submittedData?.submittedAt
                      ? new Date(submittedData.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Just now"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-[#121827]">
                  <span className="text-[#8e9db2] block text-[10px]">COHORT</span>
                  <strong className="font-mono text-white text-xs">{previousSection} &rarr; {desiredSection}</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#121827]">
                  <span className="text-[#8e9db2] block text-[10px]">COURSES</span>
                  <strong className="font-mono text-white text-xs">{selectedCourses.length} Courses</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#121827]">
                  <span className="text-[#8e9db2] block text-[10px]">CREDITS</span>
                  <strong className="font-mono text-emerald-400 text-xs">{totalCredits.toFixed(1)} Cr</strong>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0b0f19] font-semibold text-xs transition-all shadow-xs"
              >
                Return to Dashboard
              </Link>
              <Link
                href="/student/tracking"
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#172136] hover:bg-[#1a233a] text-slate-200 border border-[#25324d] font-medium text-xs transition-all"
              >
                Track Advising Status
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
