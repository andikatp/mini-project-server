import { prisma } from "../db";
import { ForbiddenError, NotFoundError } from "../errors";

/**
 * Retrieve high-level summary metrics for an organizer's dashboard:
 * total revenue, transaction counts, tickets sold, and breakdown per event.
 *
 * @param organizerId The ID of the authenticated event organizer.
 */
export async function getOrganizerDashboardSummary(organizerId: string) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      ticketTypes: {
        select: {
          id: true,
          soldQty: true,
          quota: true,
        },
      },
    },
  });

  const eventIds = events.map((e) => e.id);

  // 1. Calculate aggregated revenue and count of completed transactions
  const doneTransactions = await prisma.transaction.aggregate({
    where: {
      eventId: { in: eventIds },
      status: "DONE",
    },
    _sum: {
      totalIdr: true,
    },
    _count: {
      id: true,
    },
  });

  // 2. Count transactions pending manual proof verification
  const pendingConfirmations = await prisma.transaction.count({
    where: {
      eventId: { in: eventIds },
      status: "WAITING_FOR_ADMIN_CONFIRMATION",
    },
  });

  const totalTicketsSold = events.reduce((acc, ev) => {
    return acc + ev.ticketTypes.reduce((sum, tt) => sum + tt.soldQty, 0);
  }, 0);

  const activeEventsCount = events.filter((e) => e.status === "PUBLISHED").length;

  return {
    totalRevenueIdr: doneTransactions._sum.totalIdr ?? 0,
    totalTransactionsCount: doneTransactions._count.id ?? 0,
    totalTicketsSold,
    activeEventsCount,
    totalEventsCount: events.length,
    pendingConfirmationsCount: pendingConfirmations,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      status: e.status,
      ticketsSold: e.ticketTypes.reduce((sum, tt) => sum + tt.soldQty, 0),
      totalCapacity: e.ticketTypes.reduce((sum, tt) => sum + tt.quota, 0),
    })),
  };
}

/**
 * Group completed transaction metrics by day, month, or year for time-series charts.
 *
 * @param organizerId The ID of the authenticated event organizer.
 * @param granularity The time grouping level: 'day' | 'month' | 'year'.
 * @param eventId Optional event ID filter.
 */
export async function getOrganizerDashboardTimeseries(
  organizerId: string,
  granularity: "day" | "month" | "year",
  eventId?: string,
) {
  const eventFilter: Record<string, any> = { organizerId };
  if (eventId) {
    eventFilter.id = eventId;
  }

  const events = await prisma.event.findMany({
    where: eventFilter,
    select: { id: true },
  });

  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return [];
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      eventId: { in: eventIds },
      status: "DONE",
    },
    select: {
      totalIdr: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const grouped = new Map<string, { label: string; date: string; revenueIdr: number; ticketsSold: number; transactionCount: number }>();

  for (const tx of transactions) {
    const d = new Date(tx.createdAt);
    let key = "";
    let label = "";

    if (granularity === "day") {
      key = d.toISOString().split("T")[0]!;
      label = key;
    } else if (granularity === "month") {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      key = `${year}-${month}`;
      label = d.toLocaleString("default", { month: "short", year: "numeric" });
    } else {
      key = String(d.getFullYear());
      label = key;
    }

    const current = grouped.get(key) || {
      label,
      date: key,
      revenueIdr: 0,
      ticketsSold: 0,
      transactionCount: 0,
    };

    const ticketsInTx = tx.items.reduce((acc, item) => acc + item.quantity, 0);

    current.revenueIdr += tx.totalIdr;
    current.ticketsSold += ticketsInTx;
    current.transactionCount += 1;

    grouped.set(key, current);
  }

  return Array.from(grouped.values());
}

/**
 * Fetch paginated attendee list for a specific event owned by the organizer.
 * Only includes attendees with completed (DONE) transactions.
 *
 * @param organizerId The ID of the authenticated event organizer.
 * @param eventId The target event ID.
 * @param page Current page number (default: 1).
 * @param limit Items per page (default: 20).
 * @param search Optional search term matching attendee name or email.
 */
export async function getOrganizerEventAttendees(
  organizerId: string,
  eventId: string,
  page = 1,
  limit = 20,
  search?: string,
) {
  // 1. Verify event existence and ownership
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, organizerId: true },
  });

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not have access to this event");
  }

  const whereClause: Record<string, any> = {
    eventId,
    status: "DONE",
  };

  if (search) {
    whereClause.customer = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [totalCount, transactions] = await Promise.all([
    prisma.transaction.count({ where: whereClause }),
    prisma.transaction.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        totalIdr: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        items: {
          select: {
            id: true,
            ticketName: true,
            priceIdr: true,
            quantity: true,
            subtotalIdr: true,
          },
        },
      },
    }),
  ]);

  const attendees = transactions.map((tx) => ({
    transactionId: tx.id,
    transactionCode: tx.code,
    customerId: tx.customer.id,
    name: tx.customer.name,
    email: tx.customer.email,
    avatarUrl: tx.customer.avatarUrl,
    totalPaidIdr: tx.totalIdr,
    ticketQuantity: tx.items.reduce((acc, it) => acc + it.quantity, 0),
    tickets: tx.items.map((it) => ({
      name: it.ticketName,
      quantity: it.quantity,
      priceIdr: it.priceIdr,
    })),
    purchaseDate: tx.createdAt,
  }));

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    attendees,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * List all transactions across an organizer's owned events with optional status filtering.
 *
 * @param organizerId The ID of the authenticated event organizer.
 * @param status Optional transaction status filter.
 * @param page Current page number (default: 1).
 * @param limit Items per page (default: 20).
 */
export async function getOrganizerTransactions(
  organizerId: string,
  status?: string,
  page = 1,
  limit = 20,
) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    select: { id: true },
  });

  const eventIds = events.map((e) => e.id);

  const whereClause: Record<string, any> = {
    eventId: { in: eventIds },
  };

  if (status) {
    whereClause.status = status;
  }

  const [totalCount, transactions] = await Promise.all([
    prisma.transaction.count({ where: whereClause }),
    prisma.transaction.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        items: true,
        paymentProof: true,
      },
    }),
  ]);

  return {
    transactions,
    meta: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Accept and approve an uploaded payment proof for a transaction.
 * Transitions transaction status: WAITING_FOR_ADMIN_CONFIRMATION -> DONE.
 *
 * @param organizerId The ID of the authenticated event organizer.
 * @param transactionId The ID of the transaction to accept.
 */
export async function acceptTransactionProof(organizerId: string, transactionId: string) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      event: true,
      paymentProof: true,
    },
  });

  if (!tx) {
    throw new NotFoundError("Transaction not found");
  }

  if (tx.event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not have access to this event transaction");
  }

  if (tx.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
    throw new ForbiddenError(`Cannot accept transaction with status: ${tx.status}`);
  }

  const updated = await prisma.$transaction(async (prismaClient) => {
    const updatedTx = await prismaClient.transaction.update({
      where: { id: transactionId },
      data: {
        status: "DONE",
      },
    });

    if (tx.paymentProof) {
      await prismaClient.paymentProof.update({
        where: { id: tx.paymentProof.id },
        data: {
          reviewedByUserId: organizerId,
          reviewedAt: new Date(),
        },
      });
    }

    return updatedTx;
  });

  return updated;
}

/**
 * Reject an uploaded payment proof for a transaction.
 * Transitions transaction status: WAITING_FOR_ADMIN_CONFIRMATION -> REJECTED.
 *
 * @param organizerId The ID of the authenticated event organizer.
 * @param transactionId The ID of the transaction to reject.
 * @param reason Mandatory reason explaining why the payment proof was rejected.
 */
export async function rejectTransactionProof(
  organizerId: string,
  transactionId: string,
  reason: string,
) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      event: true,
      paymentProof: true,
    },
  });

  if (!tx) {
    throw new NotFoundError("Transaction not found");
  }

  if (tx.event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not have access to this event transaction");
  }

  if (tx.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
    throw new ForbiddenError(`Cannot reject transaction with status: ${tx.status}`);
  }

  const updated = await prisma.$transaction(async (prismaClient) => {
    const updatedTx = await prismaClient.transaction.update({
      where: { id: transactionId },
      data: {
        status: "REJECTED",
        rollbackProcessedAt: new Date(),
      },
    });

    if (tx.paymentProof) {
      await prismaClient.paymentProof.update({
        where: { id: tx.paymentProof.id },
        data: {
          reviewedByUserId: organizerId,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      });
    }

    return updatedTx;
  });

  return updated;
}
