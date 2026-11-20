import { z } from "zod";

export const courseSelectionItemSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  courseCode: z.string().min(1, "Course code is required"),
  courseTitle: z.string().min(1, "Course title is required"),
  credits: z.number().positive("Credits must be a positive number"),
  sectionId: z.string().min(1, "Section ID is required"),
  sectionName: z.string().min(1, "Section name is required"),
  courseType: z.enum(["general", "retake"], {
    message: "Each course must be explicitly classified as 'general' or 'retake'",
  }),
});

export const studentRegistrationSubmitSchema = z.object({
  previousSection: z
    .string()
    .trim()
    .min(1, "Previous Section is required (e.g. 69_K)")
    .max(20, "Section format exceeds maximum allowed length of 20 characters"),
  desiredSection: z
    .string()
    .trim()
    .min(1, "Desired Section is required (e.g. 69_D)")
    .max(20, "Section format exceeds maximum allowed length of 20 characters"),
  courses: z
    .array(courseSelectionItemSchema)
    .min(1, "Select at least 1 course to submit registration application")
    .max(8, "Cannot register for more than 8 courses simultaneously"),
  isPaid: z.boolean().optional().default(true),
});

export type CourseSelectionItemInput = z.infer<typeof courseSelectionItemSchema>;
export type StudentRegistrationSubmitInput = z.infer<typeof studentRegistrationSubmitSchema>;

export const courseRegistrationDraftSchema = z.object({
  semesterId: z.string().uuid("Invalid semester ID"),
  sectionIds: z
    .array(z.string().uuid("Invalid section ID"))
    .min(1, "Select at least 1 course section to register")
    .max(8, "Cannot register for more than 8 sections simultaneously"),
});

export const advisorReviewActionSchema = z.object({
  registrationId: z.string().uuid("Invalid registration ID"),
  action: z.enum(["approve", "reject"]),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type CourseRegistrationDraftInput = z.infer<typeof courseRegistrationDraftSchema>;
export type AdvisorReviewActionInput = z.infer<typeof advisorReviewActionSchema>;

export type RegistrationStatus =
  | "draft"
  | "pending_advisor"
  | "approved"
  | "rejected"
  | "dropped";

/**
 * Validates registration state machine transitions according to DIU institutional security policy:
 * - Students can only modify or submit applications in 'draft' status.
 * - Students can only transition 'draft' -> 'pending_advisor'. They CANNOT self-approve.
 * - Advisors can only review applications in 'pending_advisor' status.
 * - Advisors can only transition 'pending_advisor' -> 'approved' or 'rejected'.
 * - Department Heads and Admins retain administrative override permissions.
 */
export function validateRegistrationStateTransition(
  currentStatus: RegistrationStatus,
  targetStatus: RegistrationStatus,
  role: "student" | "advisor" | "department_head" | "admin"
): { allowed: boolean; reason?: string } {
  if (role === "admin" || role === "department_head") {
    return { allowed: true };
  }

  if (role === "student") {
    if (currentStatus !== "draft") {
      return {
        allowed: false,
        reason: `Students cannot modify an application with status '${currentStatus}'. Only 'draft' applications may be edited or submitted.`,
      };
    }
    if (targetStatus !== "draft" && targetStatus !== "pending_advisor") {
      return {
        allowed: false,
        reason: `Students can only transition an application to 'pending_advisor' (submission) or remain in 'draft'. Unauthorized target status: '${targetStatus}'.`,
      };
    }
    return { allowed: true };
  }

  if (role === "advisor") {
    if (currentStatus !== "pending_advisor") {
      return {
        allowed: false,
        reason: `Advisors can only review applications in 'pending_advisor' status. Current status is '${currentStatus}'.`,
      };
    }
    if (targetStatus !== "approved" && targetStatus !== "rejected") {
      return {
        allowed: false,
        reason: `Advisors can only approve or reject pending applications. Unauthorized target status: '${targetStatus}'.`,
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Unauthorized role for registration updates." };
}
