import { z } from "zod";

export const eventIdParamSchema = z.object({
  eventId: z.uuid("Invalid event ID format"),
});

export const ticketTypeIdParamSchema = z.object({
  ticketTypeId: z.uuid("Invalid ticket type ID format"),
});

export const voucherIdParamSchema = z.object({
  voucherId: z.uuid("Invalid voucher ID format"),
});

export const createEventSchema = z.object({
  categoryId: z.uuid("Invalid category ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().min(10, "Description must be at least 10 characters"),
  bannerUrl: z.url("Banner URL must be a valid URL").optional().nullable(),
  location: z.string().min(3, "Location is required"),
  city: z.string().min(2, "City is required"),
  startAt: z.coerce.date().refine((d) => !isNaN(d.getTime()), "Invalid start date"),
  endAt: z.coerce.date().refine((d) => !isNaN(d.getTime()), "Invalid end date"),
}).refine((data) => data.endAt > data.startAt, {
  message: "End date must be after start date",
  path: ["endAt"],
});

export const updateEventSchema = z.object({
  categoryId: z.uuid("Invalid category ID").optional(),
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(10).optional(),
  bannerUrl: z.url().optional().nullable(),
  location: z.string().min(3).optional(),
  city: z.string().min(2).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
}).refine((data) => {
  if (data.startAt && data.endAt) {
    return data.endAt > data.startAt;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endAt"],
});

export const publicEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
});

export const createTicketTypeSchema = z.object({
  name: z.string().min(1, "Ticket name is required").max(100),
  description: z.string().max(255).optional().nullable(),
  priceIdr: z.coerce.number().int().min(0, "Price must be >= 0"),
  quota: z.coerce.number().int().min(1, "Quota must be at least 1"),
});

export const updateTicketTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  priceIdr: z.coerce.number().int().min(0).optional(),
  quota: z.coerce.number().int().min(0).optional(),
});

export const createEventVoucherSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only alphanumeric characters, dashes, or underscores")
    .transform((v) => v.toUpperCase()),
  discountType: z.enum(["FIXED", "PERCENT"]),
  amount: z.coerce.number().int().positive("Amount must be greater than 0"),
  quota: z.coerce.number().int().positive("Quota must be greater than 0"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
}).refine((data) => data.endAt > data.startAt, {
  message: "Voucher end date must be after start date",
  path: ["endAt"],
}).refine((data) => {
  if (data.discountType === "PERCENT" && data.amount > 100) {
    return false;
  }
  return true;
}, {
  message: "Percentage discount cannot exceed 100%",
  path: ["amount"],
});

export const updateEventVoucherSchema = z.object({
  amount: z.coerce.number().int().positive().optional(),
  quota: z.coerce.number().int().positive().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
}).refine((data) => {
  if (data.startAt && data.endAt) {
    return data.endAt > data.startAt;
  }
  return true;
}, {
  message: "Voucher end date must be after start date",
  path: ["endAt"],
});
