import type {
  ScheduleSlot,
  RegistrationStatus,
  SemesterSeason,
} from "@/types/database";
import type { SectionRow } from "@/lib/mock/data";

/**
 * Checks whether all prerequisite course codes have been completed by the student.
 */
export function getPrerequisiteStatus(
  prerequisiteCodes: string[],
  completedCourseCodes: string[]
): {
  isEligible: boolean;
  missingCodes: string[];
} {
  if (!prerequisiteCodes || prerequisiteCodes.length === 0) {
    return { isEligible: true, missingCodes: [] };
  }

  const missingCodes = prerequisiteCodes.filter(
    (code) => !completedCourseCodes.includes(code)
  );

  return {
    isEligible: missingCodes.length === 0,
    missingCodes,
  };
}

/**
 * Calculates section enrollment capacity state.
 */
export function getSectionAvailability(section: SectionRow): {
  status: "available" | "almost-full" | "full";
  availableSeats: number;
  percentageEnrolled: number;
} {
  const availableSeats = Math.max(0, section.capacity - section.enrolled_count);
  const percentageEnrolled = Math.round(
    (section.enrolled_count / section.capacity) * 100
  );

  if (availableSeats === 0) {
    return { status: "full", availableSeats, percentageEnrolled };
  }
  if (availableSeats <= 5 || percentageEnrolled >= 90) {
    return { status: "almost-full", availableSeats, percentageEnrolled };
  }
  return { status: "available", availableSeats, percentageEnrolled };
}

/**
 * Converts "HH:mm" 24h string to minutes from start of day for comparison.
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Detects if two schedule time slots overlap on the same day of the week.
 */
export function doSlotsOverlap(slot1: ScheduleSlot, slot2: ScheduleSlot): boolean {
  if (slot1.day !== slot2.day) return false;

  const start1 = timeToMinutes(slot1.start_time);
  const end1 = timeToMinutes(slot1.end_time);
  const start2 = timeToMinutes(slot2.start_time);
  const end2 = timeToMinutes(slot2.end_time);

  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Checks if a candidate section has a schedule collision with any already selected sections.
 */
export function checkScheduleConflict(
  candidateSlots: ScheduleSlot[],
  existingSections: Array<{ schedule: ScheduleSlot[]; course_code?: string; section_name: string }>
): {
  hasConflict: boolean;
  conflictingDetails?: {
    conflictingCourseCode: string;
    conflictingSectionName: string;
    day: string;
    time: string;
  };
} {
  for (const candidateSlot of candidateSlots) {
    for (const existing of existingSections) {
      for (const existingSlot of existing.schedule) {
        if (doSlotsOverlap(candidateSlot, existingSlot)) {
          return {
            hasConflict: true,
            conflictingDetails: {
              conflictingCourseCode: existing.course_code || "Selected Course",
              conflictingSectionName: existing.section_name,
              day: candidateSlot.day,
              time: `${candidateSlot.start_time} - ${candidateSlot.end_time}`,
            },
          };
        }
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Computes maximum allowable semester credits according to DIU academic policies.
 * DIU Policy:
 * - CGPA >= 3.75: up to 18.0 credits (or 21.0 in graduating final semester)
 * - CGPA 3.00 - 3.74: up to 15.0 credits
 * - CGPA 2.00 - 2.99: up to 13.5 credits
 * - CGPA < 2.00 (Academic Probation): capped at 9.0 to 12.0 credits max
 */
export function getCreditLimitByCgpa(cgpa: number | null | undefined): {
  maxCredits: number;
  minCredits: number;
  isProbation: boolean;
  policyNote: string;
} {
  const gpa = cgpa ?? 3.0;

  if (gpa < 2.0) {
    return {
      maxCredits: 9.0,
      minCredits: 6.0,
      isProbation: true,
      policyNote: "Academic Probation Policy: Limited to 9.0 credits under mandatory advisor monitoring.",
    };
  }

  if (gpa < 2.5) {
    return {
      maxCredits: 12.0,
      minCredits: 9.0,
      isProbation: false,
      policyNote: "Standard load restriction (12.0 credits max for CGPA below 2.50).",
    };
  }

  if (gpa < 3.75) {
    return {
      maxCredits: 15.0,
      minCredits: 9.0,
      isProbation: false,
      policyNote: "Regular degree progression load (15.0 credits max).",
    };
  }

  return {
    maxCredits: 18.0,
    minCredits: 9.0,
    isProbation: false,
    policyNote: "Honors student load privilege (up to 18.0 credits permitted).",
  };
}

/**
 * Formats a ScheduleSlot into a human-readable string.
 */
export function formatScheduleSlot(slot: ScheduleSlot): string {
  return `${slot.day} ${slot.start_time}–${slot.end_time}${slot.room ? ` (${slot.room})` : ""}`;
}

/**
 * Formats Semester Season and Year into standard academic title.
 */
export function formatSemesterName(season: SemesterSeason, year: number): string {
  const capSeason = season.charAt(0).toUpperCase() + season.slice(1);
  return `${capSeason} ${year}`;
}

/**
 * Maps a registration lifecycle status to a badge visual variant.
 */
export function getStatusBadgeVariant(status: RegistrationStatus): "default" | "success" | "warning" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "approved":
      return "success";
    case "pending_advisor":
      return "warning";
    case "rejected":
      return "destructive";
    case "draft":
      return "outline";
    case "dropped":
      return "secondary";
    default:
      return "default";
  }
}

/**
 * Formats status string for display.
 */
export function formatStatusLabel(status: RegistrationStatus): string {
  switch (status) {
    case "draft":
      return "Draft (Not Submitted)";
    case "pending_advisor":
      return "Pending Advisor Review";
    case "approved":
      return "Approved & Enrolled";
    case "rejected":
      return "Revision Requested";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

/**
 * Mock transactional notifications for student and advisor prototypes.
 */
export function generateMockNotifications() {
  return [
    {
      id: "notif-01",
      title: "Advising Period Open",
      message: "Spring 2026 course advising window is open until January 25, 2026.",
      type: "info",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: "notif-02",
      title: "Prerequisite Notice",
      message: "CSE221 Algorithms requires passed grade in CSE122 Data Structures.",
      type: "warning",
      timestamp: "1 day ago",
      read: true,
    },
    {
      id: "notif-03",
      title: "Faculty Advisor Assigned",
      message: "Dr. Sheak Rashed Haider Noori has been designated as your faculty advisor.",
      type: "success",
      timestamp: "3 days ago",
      read: true,
    },
  ];
}
