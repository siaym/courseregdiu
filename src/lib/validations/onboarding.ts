import { z } from "zod";

/**
 * DIU First-Time Student Onboarding Validation Schema
 * Authoritative verification will link to DIU ERP/Student Information System in Phase 2+.
 * For Phase 1, format structure is validated without inventing rigid fictional constraints.
 */
export const studentOnboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full Name must be at least 3 characters")
    .max(100, "Full Name must not exceed 100 characters"),

  diuId: z
    .string()
    .trim()
    .min(9, "DIU Student ID must be in standard format (e.g. 221-15-12345)")
    .max(20, "DIU Student ID is too long")
    .regex(
      /^\d{3}-\d{2}-\d{4,6}$/,
      "Student ID format must follow DIU convention: Semester-Dept-Roll (e.g. 221-15-12345)"
    ),

  batch: z
    .string()
    .trim()
    .min(1, "Academic Intake Batch is required (e.g. 60th Batch, 59th Batch)")
    .max(30, "Batch name is too long"),

  departmentCode: z
    .string()
    .min(2, "Department selection is required"),
});

export type StudentOnboardingInput = z.infer<typeof studentOnboardingSchema>;
