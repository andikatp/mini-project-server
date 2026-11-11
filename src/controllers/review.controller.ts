import type { Request, Response } from "express";
import {
  createEventReview,
  getEventReviews,
  getOrganizerReviews,
  updateReviewStatus,
} from "../services/review.service";
import { sendSuccess } from "../utils/response";

export async function createReviewHandler(req: Request, res: Response) {
  const customerId = req.user!.id;
  const eventId = String(req.params.eventId);
  const review = await createEventReview(customerId, eventId, req.body);
  return sendSuccess(res, 201, "Review submitted successfully and is pending approval", review);
}

export async function getEventReviewsHandler(req: Request, res: Response) {
  const eventId = String(req.params.eventId);
  const result = await getEventReviews(eventId);
  return sendSuccess(res, 200, "Event reviews retrieved successfully", result);
}

export async function getOrganizerReviewsHandler(req: Request, res: Response) {
  const organizerId = String(req.params.organizerId);
  const reviews = await getOrganizerReviews(organizerId);
  return sendSuccess(res, 200, "Organizer reviews retrieved successfully", reviews);
}

export async function updateReviewStatusHandler(req: Request, res: Response) {
  const organizerId = req.user!.id;
  const reviewId = String(req.params.reviewId);
  const review = await updateReviewStatus(organizerId, reviewId, req.body);
  return sendSuccess(res, 200, "Review status updated successfully", review);
}
