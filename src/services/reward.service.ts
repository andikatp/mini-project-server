import { prisma } from "../db";
import { NotFoundError, ValidationError } from "../errors";

/**
 * Get customer's active points balance and bucket breakdown with pagination.
 * Balance = sum of unexpired, unconsumed credits (remainingAmount).
 *
 * @param userId ID of the authenticated user
 * @param page Current page number (default: 1)
 * @param limit Items per page (default: 10)
 */
export async function getUserPointsService(
  userId: string,
  page: number = 1,
  limit: number = 10,
) {
  const now = new Date();
  const safePage = Math.max(page, 1);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  // 1. Calculate active usable points balance using DB aggregate
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

  const totalPoints = aggregateResult._sum.remainingAmount ?? 0;

  // 2. Fetch paginated point credits and total count
  const [credits, total] = await Promise.all([
    prisma.pointCredit.findMany({
      where: { userId },
      orderBy: { expiresAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.pointCredit.count({
      where: { userId },
    }),
  ]);

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
    totalPoints,
    credits: history,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
}

/**
 * Get customer's system coupons (WELCOME coupons from referrals, etc.) with pagination.
 *
 * @param userId ID of the authenticated user
 * @param page Current page number (default: 1)
 * @param limit Items per page (default: 10)
 */
export async function getUserCouponsService(
  userId: string,
  page: number = 1,
  limit: number = 10,
) {
  const now = new Date();
  const safePage = Math.max(page, 1);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [coupons, total] = await Promise.all([
    prisma.systemCoupon.findMany({
      where: { userId },
      orderBy: { expiredAt: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.systemCoupon.count({
      where: { userId },
    }),
  ]);

  const mappedCoupons = coupons.map((coupon) => {
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

  return {
    coupons: mappedCoupons,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
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

