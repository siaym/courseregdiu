import { z } from "zod";

export const createAdvisorSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Valid email address is required"),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  roomNumber: z.string().trim().max(50).optional().or(z.literal("")),
  schedule: z.string().trim().max(200).optional().or(z.literal("")),
  departmentCode: z.string().trim().max(10).optional().or(z.literal("")),
  employeeId: z.string().trim().max(40).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateAdvisorSchema = createAdvisorSchema.extend({
  id: z.string().uuid("Invalid advisor ID"),
});

export const toggleAdvisorActiveSchema = z.object({
  id: z.string().uuid("Invalid advisor ID"),
  isActive: z.boolean(),
  reason: z.string().trim().min(3, "Audit reason is required").max(300),
});

export const createBatchSchema = z.object({
  batchLabel: z.string().trim().min(1, "Batch label is required").max(60),
  batchNumber: z
    .string()
    .trim()
    .regex(/^\d*$/, "Batch number must contain digits only")
    .max(10)
    .optional()
    .or(z.literal("")),
  departmentCode: z.string().trim().max(10).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateBatchSchema = createBatchSchema.extend({
  id: z.string().uuid("Invalid batch ID"),
});

export const toggleBatchActiveSchema = z.object({
  id: z.string().uuid("Invalid batch ID"),
  isActive: z.boolean(),
  reason: z.string().trim().min(3, "Audit reason is required").max(300),
});

export type CreateAdvisorInput = z.infer<typeof createAdvisorSchema>;
export type UpdateAdvisorInput = z.infer<typeof updateAdvisorSchema>;
export type ToggleAdvisorActiveInput = z.infer<typeof toggleAdvisorActiveSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type ToggleBatchActiveInput = z.infer<typeof toggleBatchActiveSchema>;
