import { z } from "zod";

/**
 * DIU First-Time Student Onboarding Validation Schema
 * Authoritative verification: strictly requires Full Name, DIU Student ID, and Batch.
 * Matches official DIU conventions (e.g. 211-15-456 or 221-15-12345).
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
    .min(8, "DIU Student ID must follow format XXX-XX-XXX (e.g. 211-15-456 or 221-15-12345)")
    .max(20, "DIU Student ID is too long")
    .regex(
      /^\d{3}-\d{2}-\d{3,6}$/,
      "Student ID format must follow DIU convention: Semester-Dept-Roll (e.g. 211-15-456 or 221-15-12345)"
    ),

  batch: z
    .string()
    .trim()
    .min(1, "Academic Intake Batch is required (e.g. 61st Batch, 60th Batch)")
    .max(30, "Batch name is too long"),
});

export type StudentOnboardingInput = z.infer<typeof studentOnboardingSchema>;
