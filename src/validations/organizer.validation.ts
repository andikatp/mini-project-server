import { z } from "zod";

export const dashboardTimeseriesQuerySchema = z.object({
  granularity: z.enum(["day", "month", "year"]).default("day"),
  eventId: z.string().uuid().optional(),
});

export const eventAttendeesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format"),
});

export const transactionIdParamSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID format"),
});

export const rejectProofBodySchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

