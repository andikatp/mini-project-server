import { prisma } from "../db";
import { NotFoundError, ValidationError } from "../errors";

/**
 * Get customer's active points balance and bucket breakdown.
 * Balance = sum of unexpired, unconsumed credits (remainingAmount).
 *
 * @param userId ID of the authenticated user
 */
export async function getUserPointsService(userId: string) {
  const now = new Date();

  // Fetch all active, unexpired point credits with remaining amount
  const credits = await prisma.pointCredit.findMany({
    where: {
      userId,
    },
    orderBy: { expiresAt: "asc" },
  });

  // Calculate active usable points vs expired/consumed points
  let totalActivePoints = 0;
  const history = credits.map((credit) => {
    const isExpired = credit.expiresAt <= now;
    const isUsable = !isExpired && credit.remainingAmount > 0;

    if (isUsable) {
      totalActivePoints += credit.remainingAmount;
    }

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
 */
export async function getUserCouponsService(userId: string) {
  const now = new Date();

  const coupons = await prisma.systemCoupon.findMany({
    where: {
      userId,
    },
    orderBy: { expiredAt: "asc" },
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

