import { z } from "zod";

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
