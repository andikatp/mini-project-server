import { prisma } from "../db";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";

export async function createEventReview(
  customerId: string,
  eventId: string,
  data: { rating: number; comment?: string | null },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new NotFoundError("Event not found");

  // REV-01: Must have completed transaction and event endAt must be in the past
  const completedTx = await prisma.transaction.findFirst({
    where: {
      customerId,
      eventId,
      status: "DONE",
    },
  });

  if (!completedTx) {
    throw new ForbiddenError("You can only review events you have attended with a completed transaction");
  }

  const now = new Date();
  if (event.endAt > now) {
    throw new ValidationError("Cannot review an event that has not ended yet");
  }

  // REV-02: One review per customer per event
  const existing = await prisma.review.findUnique({
    where: {
      customerId_eventId: {
        customerId,
        eventId,
      },
    },
  });

  if (existing) {
    throw new ValidationError("You have already reviewed this event");
  }

  // Reviews require organizer approval: PENDING
  return prisma.review.create({
    data: {
      customerId,
      eventId,
      rating: data.rating,
      comment: data.comment,
      status: "PENDING",
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function getEventReviews(eventId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      eventId,
      status: "APPROVED",
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  return {
    averageRating: avgRating,
    totalReviews,
    reviews,
  };
}

export async function getOrganizerReviews(organizerId: string) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);

  return prisma.review.findMany({
    where: {
      eventId: { in: eventIds },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateReviewStatus(
  organizerId: string,
  reviewId: string,
  data: {
    status: "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
  },
) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { event: true },
  });

  if (!review) throw new NotFoundError("Review not found");
  if (review.event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not have access to moderate this review");
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      status: data.status,
      rejectionReason: data.status === "REJECTED" ? data.rejectionReason : null,
      reviewedByUserId: organizerId,
    },
  });
}

