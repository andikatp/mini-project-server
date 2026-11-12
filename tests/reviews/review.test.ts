import { describe, expect, it } from "bun:test";
import { prisma } from "../../src/db";
import { ForbiddenError } from "../../src/errors";
import { createEventReview, getEventReviews } from "../../src/services/review.service";

describe("Review Service (Feature 1)", () => {
  it("should throw ForbiddenError if customer has no completed transaction for the event", async () => {
    const origEvent = prisma.event.findUnique;
    const origTx = prisma.transaction.findFirst;

    (prisma.event as any).findUnique = async () => ({
      id: "evt-1",
      endAt: new Date(Date.now() - 100000), // Ended
    });

    (prisma.transaction as any).findFirst = async () => null; // No completed transaction

    await expect(
      createEventReview("cust-1", "evt-1", { rating: 5, comment: "Awesome!" }),
    ).rejects.toThrow(ForbiddenError);

    prisma.event.findUnique = origEvent;
    prisma.transaction.findFirst = origTx;
  });

  it("should reject review if event has not ended yet", async () => {
    const origEvent = prisma.event.findUnique;
    const origTx = prisma.transaction.findFirst;

    (prisma.event as any).findUnique = async () => ({
      id: "evt-1",
      endAt: new Date(Date.now() + 1000000), // Future end time
    });

    (prisma.transaction as any).findFirst = async () => ({
      id: "tx-done",
      status: "DONE",
    });

    await expect(
      createEventReview("cust-1", "evt-1", { rating: 5, comment: "Too early" }),
    ).rejects.toThrow("Cannot review an event that has not ended yet");

    prisma.event.findUnique = origEvent;
    prisma.transaction.findFirst = origTx;
  });

  it("should compute average rating and count only for approved reviews", async () => {
    const origFindMany = prisma.review.findMany;

    (prisma.review as any).findMany = async () => [
      { id: "r-1", rating: 5, comment: "Superb", status: "APPROVED", customer: { name: "Bob" } },
      { id: "r-2", rating: 4, comment: "Good", status: "APPROVED", customer: { name: "Alice" } },
    ];

    const result = await getEventReviews("evt-1");
    expect(result.totalReviews).toBe(2);
    expect(result.averageRating).toBe(4.5);

    prisma.review.findMany = origFindMany;
  });
});
