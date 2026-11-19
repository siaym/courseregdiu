import { z } from "zod";

export const addAlternativeEmailSchema = z.object({
  profileId: z.string().min(1, "Student profile identifier is required"),
  email: z
    .string()
    .email("A valid email address is required")
    .transform((val) => val.trim().toLowerCase()),
  reason: z
    .string()
    .min(5, "Authorization reason must contain at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const updateAlternativeEmailStatusSchema = z.object({
  authorizedEmailId: z.string().min(1, "Authorized email identifier is required"),
  isActive: z.boolean(),
  reason: z
    .string()
    .min(5, "Reason for status change must contain at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const removeAlternativeEmailSchema = z.object({
  authorizedEmailId: z.string().min(1, "Authorized email identifier is required"),
  reason: z
    .string()
    .min(5, "Revocation reason must contain at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type AddAlternativeEmailInput = z.infer<typeof addAlternativeEmailSchema>;
export type UpdateAlternativeEmailStatusInput = z.infer<typeof updateAlternativeEmailStatusSchema>;
export type RemoveAlternativeEmailInput = z.infer<typeof removeAlternativeEmailSchema>;
