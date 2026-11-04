import { prisma } from "../db";
import { NotFoundError, ValidationError } from "../errors";

/**
 * Get customer's active points balance and bucket breakdown.
 * Balance = sum of unexpired, unconsumed credits (remainingAmount).
 *
 * @param userId ID of the authenticated user
 * @param limit Optional limit for credit history entries (default: 50)
 */
export async function getUserPointsService(userId: string, limit: number = 50) {
  const now = new Date();

  // 1. Calculate active usable points balance using DB aggregate for performance
  const aggregateResult = await prisma.pointCredit.aggregate({
    where: {
      userId,
      expiresAt: { gt: now },
      remainingAmount: { gt: 0 },
    },
    _sum: {
      remainingAmount: true,
    },
  });

  const totalActivePoints = aggregateResult._sum.remainingAmount ?? 0;

  // 2. Fetch bounded history of recent point credits
  const credits = await prisma.pointCredit.findMany({
    where: {
      userId,
    },
    orderBy: { expiresAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  const history = credits.map((credit) => {
    const isExpired = credit.expiresAt <= now;
    const isUsable = !isExpired && credit.remainingAmount > 0;

    return {
      id: credit.id,
      initialAmount: credit.initialAmount,
      remainingAmount: credit.remainingAmount,
      issuedAt: credit.issuedAt,
      expiresAt: credit.expiresAt,
      isExpired,
      isUsable,
    };
  });

  return {
    totalPoints: totalActivePoints,
    credits: history,
  };
}

/**
 * Get customer's system coupons (WELCOME coupons from referrals, etc.).
 *
 * @param userId ID of the authenticated user
 * @param limit Optional limit for coupons (default: 50)
 */
export async function getUserCouponsService(userId: string, limit: number = 50) {
  const now = new Date();

  const coupons = await prisma.systemCoupon.findMany({
    where: {
      userId,
    },
    orderBy: { expiredAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  return coupons.map((coupon) => {
    const isExpired = coupon.expiredAt <= now;
    const isUsable = coupon.status === "AVAILABLE" && !isExpired;

    return {
      id: coupon.id,
      code: coupon.code,
      status: isExpired && coupon.status === "AVAILABLE" ? "EXPIRED" : coupon.status,
      issuedAt: coupon.issuedAt,
      expiredAt: coupon.expiredAt,
      isUsable,
    };
  });
}

/**
 * Validate a system coupon for checkout / application.
 *
 * @param userId Customer ID
 * @param code Coupon code
 */
export async function validateSystemCouponService(userId: string, code: string) {
  const coupon = await prisma.systemCoupon.findUnique({
    where: { code },
  });

  if (!coupon || coupon.userId !== userId) {
    throw new NotFoundError("Coupon not found or does not belong to you");
  }

  if (coupon.status !== "AVAILABLE") {
    throw new ValidationError(`Coupon cannot be used (status: ${coupon.status})`);
  }

  if (coupon.expiredAt <= new Date()) {
    throw new ValidationError("Coupon has expired");
  }

  return coupon;
}

/**
 * Calculate available points for a customer without deducting them.
 * Used by checkout logic to know max points deductible.
 */
export async function getAvailablePointsCount(userId: string): Promise<number> {
  const { totalPoints } = await getUserPointsService(userId);
  return totalPoints;
}

