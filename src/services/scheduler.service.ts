import { prisma } from "../db";
import { executeRollback } from "./transaction.service";

/**
 * Idempotent expiry job:
 * 1. Finds all transactions with status WAITING_FOR_PAYMENT where paymentExpiresAt < now
 *    -> Transitions them to EXPIRED and executes rollback
 * 2. Finds all transactions with status WAITING_FOR_ADMIN_CONFIRMATION where confirmationDueAt < now
 *    -> Transitions them to CANCELED and executes rollback
 */
export async function processExpiredTransactions() {
  const now = new Date();

  // 1. Unpaid transactions past deadline
  const expiredUnpaid = await prisma.transaction.findMany({
    where: {
      status: "WAITING_FOR_PAYMENT",
      paymentExpiresAt: { lt: now },
      rollbackProcessedAt: null,
    },
    include: {
      items: true,
      pointAllocations: true,
    },
  });

  let expiredCount = 0;
  for (const tx of expiredUnpaid) {
    await prisma.$transaction(async (client) => {
      await executeRollback(tx, client);
      await client.transaction.update({
        where: { id: tx.id },
        data: {
          status: "EXPIRED",
          rollbackProcessedAt: new Date(),
        },
      });
    });
    expiredCount++;
  }

  // 2. Unconfirmed transactions past 3 days confirmation deadline
  const unconfirmed = await prisma.transaction.findMany({
    where: {
      status: "WAITING_FOR_ADMIN_CONFIRMATION",
      confirmationDueAt: { lt: now },
      rollbackProcessedAt: null,
    },
    include: {
      items: true,
      pointAllocations: true,
    },
  });

  let canceledCount = 0;
  for (const tx of unconfirmed) {
    await prisma.$transaction(async (client) => {
      await executeRollback(tx, client);
      await client.transaction.update({
        where: { id: tx.id },
        data: {
          status: "CANCELED",
          rollbackProcessedAt: new Date(),
        },
      });
    });
    canceledCount++;
  }

  return {
    expiredTransactionsCount: expiredCount,
    canceledTransactionsCount: canceledCount,
    processedAt: now,
  };
}
