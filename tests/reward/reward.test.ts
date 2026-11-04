import { describe, expect, it, mock } from "bun:test";
import { prisma } from "../../src/db";
import { NotFoundError, ValidationError } from "../../src/errors";
import {
  getUserCouponsService,
  getUserPointsService,
  validateSystemCouponService,
} from "../../src/services/reward.service";

describe("Reward & Referral Service", () => {
  describe("getUserPointsService", () => {
    it("should calculate active unexpired points correctly", async () => {
      const origPointCredit = prisma.pointCredit;
      const now = new Date();

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);

      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const mockCredits = [
        {
          id: "pc-1",
          userId: "user-1",
          initialAmount: 10000,
          remainingAmount: 10000,
          issuedAt: now,
          expiresAt: futureDate,
        },
        {
          id: "pc-2",
          userId: "user-1",
          initialAmount: 10000,
          remainingAmount: 5000,
          issuedAt: now,
          expiresAt: futureDate,
        },
        {
          id: "pc-3",
          userId: "user-1",
          initialAmount: 10000,
          remainingAmount: 10000,
          issuedAt: pastDate,
          expiresAt: pastDate, // Expired
        },
      ];

      Object.defineProperty(prisma, "pointCredit", {
        value: {
          ...origPointCredit,
          findMany: mock(async () => mockCredits),
          aggregate: mock(async () => ({
            _sum: { remainingAmount: 15000 },
          })),
        },
        configurable: true,
      });

      try {
        const result = await getUserPointsService("user-1");

        // pc-1 (10000) + pc-2 (5000) = 15000 (pc-3 is expired)
        expect(result.totalPoints).toBe(15000);
        expect(result.credits.length).toBe(3);
        expect(result.credits[0]!.isUsable).toBe(true);
        expect(result.credits[2]!.isExpired).toBe(true);
        expect(result.credits[2]!.isUsable).toBe(false);
      } finally {
        Object.defineProperty(prisma, "pointCredit", {
          value: origPointCredit,
          configurable: true,
        });
      }
    });
  });

  describe("getUserCouponsService", () => {
    it("should return coupons with accurate usability status", async () => {
      const origCoupon = prisma.systemCoupon;
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const mockCoupons = [
        {
          id: "coupon-1",
          userId: "user-1",
          code: "WELCOME-ABC123",
          status: "AVAILABLE" as const,
          issuedAt: new Date(),
          expiredAt: futureDate,
        },
        {
          id: "coupon-2",
          userId: "user-1",
          code: "WELCOME-XYZ789",
          status: "REDEEMED" as const,
          issuedAt: new Date(),
          expiredAt: futureDate,
        },
      ];

      Object.defineProperty(prisma, "systemCoupon", {
        value: { ...origCoupon, findMany: mock(async () => mockCoupons) },
        configurable: true,
      });

      try {
        const coupons = await getUserCouponsService("user-1");
        expect(coupons.length).toBe(2);
        expect(coupons[0]!.isUsable).toBe(true);
        expect(coupons[1]!.isUsable).toBe(false);
      } finally {
        Object.defineProperty(prisma, "systemCoupon", {
          value: origCoupon,
          configurable: true,
        });
      }
    });
  });

  describe("validateSystemCouponService", () => {
    it("should throw NotFoundError if coupon is missing or not owned by user", async () => {
      const origCoupon = prisma.systemCoupon;
      Object.defineProperty(prisma, "systemCoupon", {
        value: { ...origCoupon, findUnique: mock(async () => null) },
        configurable: true,
      });

      try {
        await expect(
          validateSystemCouponService("user-1", "INVALID-CODE"),
        ).rejects.toThrow(NotFoundError);
      } finally {
        Object.defineProperty(prisma, "systemCoupon", {
          value: origCoupon,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if coupon is not AVAILABLE", async () => {
      const origCoupon = prisma.systemCoupon;
      const mockCoupon = {
        id: "c-1",
        userId: "user-1",
        code: "WELCOME-USED",
        status: "REDEEMED" as const,
        expiredAt: new Date(Date.now() + 100000),
      };

      Object.defineProperty(prisma, "systemCoupon", {
        value: { ...origCoupon, findUnique: mock(async () => mockCoupon) },
        configurable: true,
      });

      try {
        await expect(
          validateSystemCouponService("user-1", "WELCOME-USED"),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "systemCoupon", {
          value: origCoupon,
          configurable: true,
        });
      }
    });

    it("should throw ValidationError if coupon has expired", async () => {
      const origCoupon = prisma.systemCoupon;
      const mockCoupon = {
        id: "c-1",
        userId: "user-1",
        code: "WELCOME-EXPIRED",
        status: "AVAILABLE" as const,
        expiredAt: new Date(Date.now() - 100000), // Past date
      };

      Object.defineProperty(prisma, "systemCoupon", {
        value: { ...origCoupon, findUnique: mock(async () => mockCoupon) },
        configurable: true,
      });

      try {
        await expect(
          validateSystemCouponService("user-1", "WELCOME-EXPIRED"),
        ).rejects.toThrow(ValidationError);
      } finally {
        Object.defineProperty(prisma, "systemCoupon", {
          value: origCoupon,
          configurable: true,
        });
      }
    });

    it("should return valid coupon data if owned, AVAILABLE, and not expired", async () => {
      const origCoupon = prisma.systemCoupon;
      const mockCoupon = {
        id: "c-1",
        userId: "user-1",
        code: "WELCOME-VALID",
        status: "AVAILABLE" as const,
        expiredAt: new Date(Date.now() + 100000),
      };

      Object.defineProperty(prisma, "systemCoupon", {
        value: { ...origCoupon, findUnique: mock(async () => mockCoupon) },
        configurable: true,
      });

      try {
        const coupon = await validateSystemCouponService("user-1", "WELCOME-VALID");
        expect(coupon.code).toBe("WELCOME-VALID");
        expect(coupon.status).toBe("AVAILABLE");
      } finally {
        Object.defineProperty(prisma, "systemCoupon", {
          value: origCoupon,
          configurable: true,
        });
      }
    });
  });
});

