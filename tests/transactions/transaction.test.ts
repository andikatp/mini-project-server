import { describe, expect, it } from "bun:test";
import { ConflictError } from "../../src/errors";
import {
  calculatePricing,
  executeRollback,
} from "../../src/services/transaction.service";

describe("Transaction & Checkout Service (Feature 1)", () => {
  describe("calculatePricing (Stacking voucher + coupon + points)", () => {
    it("should correctly stack voucher, 10% coupon, and points without going negative", async () => {
      const mockTickets = [
        {
          id: "tt-1",
          name: "Early Bird",
          priceIdr: 100000,
          quota: 10,
          reservedQty: 0,
          soldQty: 0,
        },
      ];

      const mockVoucher = {
        id: "v-1",
        eventId: "evt-1",
        code: "SALE20",
        discountType: "FIXED",
        amount: 20000, // IDR 20,000 discount
        quota: 10,
        usedQty: 0,
        startAt: new Date(Date.now() - 10000),
        endAt: new Date(Date.now() + 1000000),
      };

      const mockCoupon = {
        id: "c-1",
        userId: "cust-1",
        code: "REF-COUPON",
        status: "AVAILABLE",
        expiredAt: new Date(Date.now() + 1000000),
      };

      const mockPoints = [
        {
          id: "pc-1",
          userId: "cust-1",
          remainingAmount: 15000,
          expiresAt: new Date(Date.now() + 1000000),
        },
      ];

      const mockClient = {
        ticketType: {
          findMany: async () => mockTickets,
        },
        eventVoucher: {
          findUnique: async () => mockVoucher,
        },
        systemCoupon: {
          findUnique: async () => mockCoupon,
        },
        pointCredit: {
          findMany: async () => mockPoints,
        },
      };

      // Subtotal = 100,000
      // Voucher = 20,000 -> remaining 80,000
      // Coupon 10% = 8,000 -> remaining 72,000
      // Points used = 15,000 -> remaining 57,000
      const pricing = await calculatePricing(
        "evt-1",
        [{ ticketTypeId: "tt-1", quantity: 1 }],
        "cust-1",
        "SALE20",
        "REF-COUPON",
        true,
        mockClient,
      );

      expect(pricing.subtotalIdr).toBe(100000);
      expect(pricing.voucherDiscountIdr).toBe(20000);
      expect(pricing.couponDiscountIdr).toBe(8000);
      expect(pricing.pointsUsed).toBe(15000);
      expect(pricing.totalIdr).toBe(57000);
    });

    it("should throw ConflictError if ticket quantity exceeds available capacity", async () => {
      const mockTickets = [
        {
          id: "tt-1",
          name: "Early Bird",
          priceIdr: 100000,
          quota: 5,
          reservedQty: 3,
          soldQty: 2, // 0 available
        },
      ];

      const mockClient = {
        ticketType: {
          findMany: async () => mockTickets,
        },
      };

      expect(
        calculatePricing(
          "evt-1",
          [{ ticketTypeId: "tt-1", quantity: 1 }],
          "cust-1",
          null,
          null,
          false,
          mockClient,
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("executeRollback (Idempotence & matrix)", () => {
    it("should restore reserved tickets, points, and coupon exactly once", async () => {
      let ticketReservedDecremented = 0;
      let pointsRestored = 0;
      let couponRestored = false;

      const mockClient = {
        ticketType: {
          update: async ({ data }: any) => {
            ticketReservedDecremented += data.reservedQty.decrement;
          },
        },
        pointCredit: {
          update: async ({ data }: any) => {
            pointsRestored += data.remainingAmount.increment;
          },
        },
        pointAllocation: {
          update: async () => {},
        },
        systemCoupon: {
          findFirst: async () => ({ id: "c-1" }),
          update: async () => {
            couponRestored = true;
          },
        },
        eventVoucher: {
          findFirst: async () => null,
        },
      };

      const mockTx: any = {
        id: "tx-1",
        customerId: "cust-1",
        eventId: "evt-1",
        rollbackProcessedAt: null,
        couponDiscountIdr: 10000,
        voucherDiscountIdr: 0,
        items: [{ ticketTypeId: "tt-1", quantity: 2 }],
        pointAllocations: [
          {
            id: "pa-1",
            pointCreditId: "pc-1",
            amountUsed: 5000,
            status: "RESERVED",
          },
        ],
      };

      // 1. First execution
      await executeRollback(mockTx, mockClient);
      expect(ticketReservedDecremented).toBe(2);
      expect(pointsRestored).toBe(5000);
      expect(couponRestored).toBe(true);

      // 2. Second execution (with rollbackProcessedAt set) -> idempotent, does nothing
      mockTx.rollbackProcessedAt = new Date();
      await executeRollback(mockTx, mockClient);
      expect(ticketReservedDecremented).toBe(2);
      expect(pointsRestored).toBe(5000);
    });
  });
});
