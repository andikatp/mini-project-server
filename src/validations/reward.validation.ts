import { z } from "zod";

export const validateCouponParamsSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .max(50, "Coupon code is too long")
    .regex(/^[A-Z0-9_-]+$/i, "Invalid coupon code format"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

