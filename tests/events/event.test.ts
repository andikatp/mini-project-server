import { describe, expect, it } from "bun:test";
import { prisma } from "../../src/db";
import { ConflictError, ForbiddenError } from "../../src/errors";
import {
  listPublicEvents,
  publishOrganizerEvent,
  updateTicketType,
} from "../../src/services/event.service";

describe("Event Service (Feature 1)", () => {
  describe("listPublicEvents", () => {
    it("should return paginated list of published events with calculated available tickets", async () => {
      const origFindMany = prisma.event.findMany;
      const origCount = prisma.event.count;

      const mockEvents = [
        {
          id: "evt-1",
          title: "Tech Conference",
          slug: "tech-conference-123",
          description: "Big conference",
          bannerUrl: null,
          location: "Hall A",
          city: "Jakarta",
          status: "PUBLISHED",
          startAt: new Date("2026-12-01"),
          endAt: new Date("2026-12-02"),
          category: { id: "cat-1", name: "Tech", slug: "tech" },
          organizer: { id: "org-1", name: "Organizer One", avatarUrl: null },
          ticketTypes: [
            { id: "tt-1", name: "VIP", priceIdr: 500000, quota: 100, reservedQty: 10, soldQty: 20 },
            { id: "tt-2", name: "Regular", priceIdr: 100000, quota: 200, reservedQty: 0, soldQty: 50 },
          ],
        },
      ];

      (prisma.event as any).findMany = async () => mockEvents;
      (prisma.event as any).count = async () => 1;

      const result = await listPublicEvents({ page: 1, limit: 10 });

      expect(result.events.length).toBe(1);
      const firstEvent = result.events[0]!;
      expect(firstEvent.minPriceIdr).toBe(100000);
      expect(firstEvent.availableTickets).toBe(70 + 150); // (100-10-20) + (200-50)
      expect(result.pagination.total).toBe(1);

      prisma.event.findMany = origFindMany;
      prisma.event.count = origCount;
    });
  });

  describe("publishOrganizerEvent", () => {
    it("should reject publishing if event has no ticket types", async () => {
      const origFindUnique = prisma.event.findUnique;

      (prisma.event as any).findUnique = async () => ({
        id: "evt-empty",
        organizerId: "org-1",
        status: "DRAFT",
        ticketTypes: [],
      });

      expect(publishOrganizerEvent("org-1", "evt-empty")).rejects.toThrow(
        "Cannot publish an event with no ticket types",
      );

      prisma.event.findUnique = origFindUnique;
    });

    it("should throw ForbiddenError if not owned by organizer", async () => {
      const origFindUnique = prisma.event.findUnique;

      (prisma.event as any).findUnique = async () => ({
        id: "evt-1",
        organizerId: "org-other",
        status: "DRAFT",
        ticketTypes: [{ id: "tt-1" }],
      });

      expect(publishOrganizerEvent("org-1", "evt-1")).rejects.toThrow(ForbiddenError);

      prisma.event.findUnique = origFindUnique;
    });
  });

  describe("updateTicketType", () => {
    it("should reject reducing capacity below reserved+sold tickets", async () => {
      const origFindUnique = prisma.ticketType.findUnique;

      (prisma.ticketType as any).findUnique = async () => ({
        id: "tt-1",
        name: "VIP",
        quota: 100,
        reservedQty: 20,
        soldQty: 30,
        event: { organizerId: "org-1" },
      });

      expect(
        updateTicketType("org-1", "tt-1", { quota: 40 }),
      ).rejects.toThrow(ConflictError);

      prisma.ticketType.findUnique = origFindUnique;
    });
  });
});
