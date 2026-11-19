import { z } from "zod";

const DIU_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "diu.edu.bd";

export const diuEmailSchema = z
  .string()
  .email("Please provide a valid email address.")
  .refine(
    (email) => email.toLowerCase().endsWith(`@${DIU_DOMAIN.toLowerCase()}`),
    {
      message: `Only institutional @${DIU_DOMAIN} email accounts are authorized.`,
    }
  );

// Standard DIU Student ID Format e.g. 211-15-1234 or 222-15-12345
export const diuStudentIdSchema = z
  .string()
  .regex(
    /^\d{3}-\d{2}-\d{4,5}$/,
    "DIU Student ID must follow standard format (e.g. 211-15-12345)"
  );

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must have at least 2 characters.").max(100),
  diuId: diuStudentIdSchema.optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+8801|01)[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number (+8801XXXXXXXXX or 01XXXXXXXXX)")
    .optional()
    .or(z.literal("")),
  departmentCode: z.string().min(2).max(10),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
