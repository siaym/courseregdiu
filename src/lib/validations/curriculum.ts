import { z } from "zod";

export const COURSE_CATEGORIES = [
  "CORE",
  "GENERAL_EDUCATION",
  "PROJECT",
  "COMMON_ELECTIVE",
  "SPECIALIZATION_ELECTIVE",
] as const;

export const SPECIALIZATION_GROUPS = [
  "ARTIFICIAL_INTELLIGENCE",
  "SOFTWARE_DEVELOPMENT",
  "NETWORK_AND_COMMUNICATION",
  "ALGORITHMS",
  "EMBEDDED_SYSTEMS_AND_ROBOTICS",
] as const;

export const CATEGORY_LABELS: Record<(typeof COURSE_CATEGORIES)[number], string> = {
  CORE: "Core Courses",
  GENERAL_EDUCATION: "General Education",
  PROJECT: "Project / FYDP",
  COMMON_ELECTIVE: "Common Elective",
  SPECIALIZATION_ELECTIVE: "Specialization Elective",
};

export const SPECIALIZATION_LABELS: Record<(typeof SPECIALIZATION_GROUPS)[number], string> = {
  ARTIFICIAL_INTELLIGENCE: "Artificial Intelligence",
  SOFTWARE_DEVELOPMENT: "Software Development",
  NETWORK_AND_COMMUNICATION: "Network and Communication",
  ALGORITHMS: "Algorithms",
  EMBEDDED_SYSTEMS_AND_ROBOTICS: "Embedded Systems and Robotics",
};

export function computeAuthoritativeCredits(
  theoryCredits: number | null | undefined,
  labCredits: number | null | undefined,
  manualTotalCredits: number | null | undefined
): { ok: boolean; totalCredits: number; error?: string } {
  const hasTheory = theoryCredits !== null && theoryCredits !== undefined && !Number.isNaN(theoryCredits);
  const hasLab = labCredits !== null && labCredits !== undefined && !Number.isNaN(labCredits);

  if (hasTheory && theoryCredits! < 0) {
    return { ok: false, totalCredits: 0, error: "Theory credits cannot be negative." };
  }
  if (hasLab && labCredits! < 0) {
    return { ok: false, totalCredits: 0, error: "Lab credits cannot be negative." };
  }

  if (hasTheory || hasLab) {
    const sum = Number(((hasTheory ? theoryCredits! : 0) + (hasLab ? labCredits! : 0)).toFixed(1));
    if (sum <= 0) {
      return { ok: false, totalCredits: 0, error: "Total credits must be greater than 0." };
    }
    return { ok: true, totalCredits: sum };
  }

  if (manualTotalCredits === null || manualTotalCredits === undefined || Number.isNaN(manualTotalCredits)) {
    return { ok: false, totalCredits: 0, error: "Provide theory/lab credits or a total credit value." };
  }
  if (manualTotalCredits <= 0) {
    return { ok: false, totalCredits: 0, error: "Total credits must be greater than 0." };
  }
  return { ok: true, totalCredits: Number(manualTotalCredits.toFixed(1)) };
}

export const masterCourseSchema = z.object({
  code: z.string().trim().min(2, "Course code is required").max(20),
  title: z.string().trim().min(2, "Course title is required").max(200),
  category: z.enum(COURSE_CATEGORIES),
  theoryCredits: z.number().min(0).max(12).nullable().optional(),
  labCredits: z.number().min(0).max(12).nullable().optional(),
  totalCredits: z.number().positive("Total credits must be positive").max(15).nullable().optional(),
  specializationGroup: z.enum(SPECIALIZATION_GROUPS).nullable().optional(),
  variant: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  departmentCode: z.string().trim().min(2).max(10).default("CSE"),
  isActive: z.boolean().default(true),
});

export const updateMasterCourseSchema = masterCourseSchema.extend({
  id: z.string().uuid("Invalid course ID"),
});

export type MasterCourseInput = z.infer<typeof masterCourseSchema>;
export type UpdateMasterCourseInput = z.infer<typeof updateMasterCourseSchema>;
