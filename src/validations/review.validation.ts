import { z } from "zod";

export const reviewIdParamSchema = z.object({
  reviewId: z.uuid("Invalid review ID format"),
});

export const eventReviewsParamSchema = z.object({
  eventId: z.uuid("Invalid event ID format"),
});

export const organizerIdParamSchema = z.object({
  organizerId: z.uuid("Invalid organizer ID format"),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5").max(5),
  comment: z.string().max(1000, "Comment cannot exceed 1000 characters").optional().nullable(),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional().nullable(),
}).refine((data) => {
  if (data.status === "REJECTED" && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting a review",
  path: ["rejectionReason"],
});
