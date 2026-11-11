import { prisma } from "../db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";

interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export async function calculatePricing(
  eventId: string,
  items: CheckoutItemInput[],
  customerId: string,
  voucherCode?: string | null,
  couponCode?: string | null,
  usePoints?: boolean,
  prismaClient: any = prisma,
) {
  // 1. Fetch tickets and calculate base subtotal
  const ticketIds = items.map((i) => i.ticketTypeId);
  const tickets = await prismaClient.ticketType.findMany({
    where: {
      id: { in: ticketIds },
      eventId,
    },
  });

  if (tickets.length !== ticketIds.length) {
    throw new ValidationError("One or more ticket types are invalid for this event");
  }

  const ticketMap = new Map<string, any>(tickets.map((t: any) => [t.id, t]));

  let subtotalIdr = 0;
  const verifiedItems: Array<{
    ticketTypeId: string;
    ticketName: string;
    priceIdr: number;
    quantity: number;
    subtotalIdr: number;
  }> = [];

  for (const item of items) {
    const t = ticketMap.get(item.ticketTypeId)!;
    const available = t.quota - t.reservedQty - t.soldQty;
    if (available < item.quantity) {
      throw new ConflictError(`Insufficient tickets available for ${t.name} (available: ${available})`);
    }

    const itemSubtotal = t.priceIdr * item.quantity;
    subtotalIdr += itemSubtotal;
    verifiedItems.push({
      ticketTypeId: t.id,
      ticketName: t.name,
      priceIdr: t.priceIdr,
      quantity: item.quantity,
      subtotalIdr: itemSubtotal,
    });
  }

  let remainingIdr = subtotalIdr;
  let voucherDiscountIdr = 0;
  let verifiedVoucher: any = null;

  // 2. Voucher discount (per-event)
  if (voucherCode) {
    const voucher = await prismaClient.eventVoucher.findUnique({
      where: { code: voucherCode.toUpperCase() },
    });

    if (!voucher || voucher.eventId !== eventId) {
      throw new ValidationError("Invalid voucher for this event");
    }

    const now = new Date();
    if (voucher.startAt > now || voucher.endAt < now) {
      throw new ValidationError("Voucher is not currently active");
    }

    if (voucher.quota > 0 && voucher.usedQty >= voucher.quota) {
      throw new ValidationError("Voucher quota has been exhausted");
    }

    if (voucher.discountType === "PERCENT") {
      voucherDiscountIdr = Math.floor((remainingIdr * voucher.amount) / 100);
    } else {
      voucherDiscountIdr = Math.min(remainingIdr, voucher.amount);
    }

    remainingIdr = Math.max(0, remainingIdr - voucherDiscountIdr);
    verifiedVoucher = voucher;
  }

  // 3. System coupon discount (all events, 10% up to standard or fixed)
  let couponDiscountIdr = 0;
  let verifiedCoupon: any = null;

  if (couponCode) {
    const coupon = await prismaClient.systemCoupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || coupon.userId !== customerId) {
      throw new ValidationError("Coupon not found or does not belong to you");
    }

    if (coupon.status !== "AVAILABLE") {
      throw new ValidationError(`Coupon cannot be used (status: ${coupon.status})`);
    }

    if (coupon.expiredAt <= new Date()) {
      throw new ValidationError("Coupon has expired");
    }

    // Standard system referral coupon is 10% discount
    couponDiscountIdr = Math.floor((remainingIdr * 10) / 100);
    remainingIdr = Math.max(0, remainingIdr - couponDiscountIdr);
    verifiedCoupon = coupon;
  }

  // 4. Points calculation (1 point = IDR 1)
  let pointsUsed = 0;
  const pointDebits: Array<{ pointCreditId: string; amount: number }> = [];

  if (usePoints && remainingIdr > 0) {
    const now = new Date();
    // Oldest unexpired credits first
    const activeCredits = await prismaClient.pointCredit.findMany({
      where: {
        userId: customerId,
        expiresAt: { gt: now },
        remainingAmount: { gt: 0 },
      },
      orderBy: { expiresAt: "asc" },
    });

    let needed = remainingIdr;
    for (const credit of activeCredits) {
      if (needed <= 0) break;
      const take = Math.min(credit.remainingAmount, needed);
      pointDebits.push({ pointCreditId: credit.id, amount: take });
      pointsUsed += take;
      needed -= take;
    }

    remainingIdr = Math.max(0, remainingIdr - pointsUsed);
  }

  const totalIdr = remainingIdr;

  return {
    subtotalIdr,
    voucherDiscountIdr,
    couponDiscountIdr,
    pointsUsed,
    totalIdr,
    items: verifiedItems,
    verifiedVoucher,
    verifiedCoupon,
    pointDebits,
  };
}

export async function previewCheckout(
  customerId: string,
  eventId: string,
  items: CheckoutItemInput[],
  voucherCode?: string | null,
  couponCode?: string | null,
  usePoints?: boolean,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") {
    throw new NotFoundError("Event not found or not published");
  }

  const pricing = await calculatePricing(
    eventId,
    items,
    customerId,
    voucherCode,
    couponCode,
    usePoints,
  );

  return {
    subtotalIdr: pricing.subtotalIdr,
    voucherDiscountIdr: pricing.voucherDiscountIdr,
    couponDiscountIdr: pricing.couponDiscountIdr,
    pointsUsed: pricing.pointsUsed,
    totalIdr: pricing.totalIdr,
    items: pricing.items,
  };
}

export async function createTransaction(
  customerId: string,
  eventId: string,
  items: CheckoutItemInput[],
  voucherCode?: string | null,
  couponCode?: string | null,
  usePoints?: boolean,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") {
    throw new NotFoundError("Event not found or not published");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Recalculate everything inside transaction with concurrency check
    const pricing = await calculatePricing(
      eventId,
      items,
      customerId,
      voucherCode,
      couponCode,
      usePoints,
      tx,
    );

    const now = new Date();
    const isFree = pricing.totalIdr === 0;
    const code = `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Adjust ticket quotas: if paid -> increment reservedQty; if free -> increment soldQty
    for (const item of pricing.items) {
      if (isFree) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { increment: item.quantity } },
        });
      } else {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reservedQty: { increment: item.quantity } },
        });
      }
    }

    // 3. Mark voucher used if applicable
    if (pricing.verifiedVoucher) {
      await tx.eventVoucher.update({
        where: { id: pricing.verifiedVoucher.id },
        data: { usedQty: { increment: 1 } },
      });
    }

    // 4. Mark coupon RESERVED or REDEEMED
    if (pricing.verifiedCoupon) {
      await tx.systemCoupon.update({
        where: { id: pricing.verifiedCoupon.id },
        data: { status: isFree ? "REDEEMED" : "RESERVED" },
      });
    }

    // 5. Deduct points and prepare PointAllocations
    const initialStatus = isFree ? "DONE" : "WAITING_FOR_PAYMENT";
    const paymentExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const createdTx = await tx.transaction.create({
      data: {
        code,
        customerId,
        eventId,
        status: initialStatus,
        subtotalIdr: pricing.subtotalIdr,
        voucherDiscountIdr: pricing.voucherDiscountIdr,
        couponDiscountIdr: pricing.couponDiscountIdr,
        pointsUsed: pricing.pointsUsed,
        totalIdr: pricing.totalIdr,
        paymentExpiresAt,
        items: {
          create: pricing.items.map((i) => ({
            ticketTypeId: i.ticketTypeId,
            ticketName: i.ticketName,
            priceIdr: i.priceIdr,
            quantity: i.quantity,
            subtotalIdr: i.subtotalIdr,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    if (pricing.pointDebits.length > 0) {
      for (const debit of pricing.pointDebits) {
        await tx.pointCredit.update({
          where: { id: debit.pointCreditId },
          data: { remainingAmount: { decrement: debit.amount } },
        });

        await tx.pointAllocation.create({
          data: {
            transactionId: createdTx.id,
            pointCreditId: debit.pointCreditId,
            amountUsed: debit.amount,
            status: isFree ? "FINALIZED" : "RESERVED",
          },
        });
      }
    }

    return createdTx;
  });
}

export async function getCustomerTransactions(customerId: string) {
  return prisma.transaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          bannerUrl: true,
          location: true,
          city: true,
          startAt: true,
          endAt: true,
        },
      },
      items: true,
      paymentProof: true,
    },
  });
}

export async function getTransactionDetail(userId: string, userRole: string, transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      event: true,
      items: true,
      paymentProof: true,
      pointAllocations: true,
    },
  });

  if (!tx) {
    throw new NotFoundError("Transaction not found");
  }

  if (userRole === "CUSTOMER" && tx.customerId !== userId) {
    throw new ForbiddenError("You do not have access to this transaction");
  }

  if (userRole === "EVENT_ORGANIZER" && tx.event.organizerId !== userId) {
    throw new ForbiddenError("You do not have access to this event transaction");
  }

  return tx;
}

export async function cancelTransactionByCustomer(customerId: string, transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      items: true,
      paymentProof: true,
      pointAllocations: true,
    },
  });

  if (!tx) throw new NotFoundError("Transaction not found");
  if (tx.customerId !== customerId) {
    throw new ForbiddenError("You do not have access to this transaction");
  }

  if (tx.status !== "WAITING_FOR_PAYMENT") {
    throw new ValidationError(`Cannot cancel transaction with status: ${tx.status}`);
  }

  return prisma.$transaction(async (client) => {
    // Perform rollback matrix
    await executeRollback(tx, client);

    return client.transaction.update({
      where: { id: transactionId },
      data: {
        status: "CANCELED",
        rollbackProcessedAt: new Date(),
      },
    });
  });
}

export async function executeRollback(tx: any, prismaClient: any) {
  if (tx.rollbackProcessedAt) {
    // Already rolled back idempotently
    return;
  }

  // 1. Release reserved ticket seats
  for (const item of tx.items) {
    await prismaClient.ticketType.update({
      where: { id: item.ticketTypeId },
      data: { reservedQty: { decrement: item.quantity } },
    });
  }

  // 2. Restore points into credit buckets
  if (tx.pointAllocations && tx.pointAllocations.length > 0) {
    for (const alloc of tx.pointAllocations) {
      if (alloc.status === "RESERVED") {
        await prismaClient.pointCredit.update({
          where: { id: alloc.pointCreditId },
          data: { remainingAmount: { increment: alloc.amountUsed } },
        });

        await prismaClient.pointAllocation.update({
          where: { id: alloc.id },
          data: {
            status: "ROLLED_BACK",
            reversedAt: new Date(),
          },
        });
      }
    }
  }

  // 3. Restore coupon if one was used
  if (tx.couponDiscountIdr > 0) {
    const coupon = await prismaClient.systemCoupon.findFirst({
      where: {
        userId: tx.customerId,
        status: "RESERVED",
      },
    });
    if (coupon) {
      await prismaClient.systemCoupon.update({
        where: { id: coupon.id },
        data: { status: "AVAILABLE" },
      });
    }
  }

  // 4. Restore event voucher if used
  if (tx.voucherDiscountIdr > 0) {
    const voucher = await prismaClient.eventVoucher.findFirst({
      where: { eventId: tx.eventId },
    });
    if (voucher && voucher.usedQty > 0) {
      await prismaClient.eventVoucher.update({
        where: { id: voucher.id },
        data: { usedQty: { decrement: 1 } },
      });
    }
  }
}

export async function uploadPaymentProof(
  customerId: string,
  transactionId: string,
  fileUrl: string,
) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) throw new NotFoundError("Transaction not found");
  if (tx.customerId !== customerId) {
    throw new ForbiddenError("You do not have access to this transaction");
  }

  if (tx.status !== "WAITING_FOR_PAYMENT") {
    throw new ValidationError(`Cannot upload payment proof for status: ${tx.status}`);
  }

  const now = new Date();
  if (now > tx.paymentExpiresAt) {
    throw new ValidationError("Payment window has expired");
  }

  const confirmationDueAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days

  return prisma.$transaction(async (client) => {
    await client.paymentProof.create({
      data: {
        transactionId,
        fileUrl,
        uploadedAt: now,
      },
    });

    return client.transaction.update({
      where: { id: transactionId },
      data: {
        status: "WAITING_FOR_ADMIN_CONFIRMATION",
        proofUploadedAt: now,
        confirmationDueAt,
      },
      include: {
        paymentProof: true,
      },
    });
  });
}
