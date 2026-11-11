import { z } from "zod";

export const transactionIdParamSchema = z.object({
  transactionId: z.uuid("Invalid transaction ID format"),
});

export const checkoutItemSchema = z.object({
  ticketTypeId: z.uuid("Invalid ticket type ID format"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
});

export const checkoutPreviewSchema = z.object({
  eventId: z.uuid("Invalid event ID format"),
  items: z.array(checkoutItemSchema).min(1, "At least one ticket item is required"),
  voucherCode: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  usePoints: z.coerce.boolean().default(false),
});

export const createTransactionSchema = z.object({
  eventId: z.uuid("Invalid event ID format"),
  items: z.array(checkoutItemSchema).min(1, "At least one ticket item is required"),
  voucherCode: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  usePoints: z.coerce.boolean().default(false),
});
