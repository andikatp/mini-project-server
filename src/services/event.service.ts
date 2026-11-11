import { prisma } from "../db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listPublicEvents(query: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  city?: string;
}) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = {
    status: "PUBLISHED",
  };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { location: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.category) {
    where.category = {
      slug: query.category,
    };
  }

  if (query.city) {
    where.city = { equals: query.city, mode: "insensitive" };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startAt: "asc" },
      include: {
        category: true,
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((e) => {
      const minPrice = e.ticketTypes.length
        ? Math.min(...e.ticketTypes.map((t) => t.priceIdr))
        : 0;
      const totalAvailable = e.ticketTypes.reduce(
        (acc, t) => acc + Math.max(0, t.quota - t.reservedQty - t.soldQty),
        0,
      );

      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        bannerUrl: e.bannerUrl,
        location: e.location,
        city: e.city,
        status: e.status,
        startAt: e.startAt,
        endAt: e.endAt,
        category: e.category,
        organizer: e.organizer,
        minPriceIdr: minPrice,
        availableTickets: totalAvailable,
        ticketTypes: e.ticketTypes.map((t) => ({
          id: t.id,
          name: t.name,
          priceIdr: t.priceIdr,
          availableQty: Math.max(0, t.quota - t.reservedQty - t.soldQty),
        })),
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPublicEventDetail(eventIdOrSlug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventIdOrSlug);
  const where = isUuid ? { id: eventIdOrSlug } : { slug: eventIdOrSlug };

  const event = await prisma.event.findUnique({
    where,
    include: {
      category: true,
      ticketTypes: true,
      organizer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      vouchers: {
        where: {
          endAt: { gt: new Date() },
        },
        select: {
          id: true,
          code: true,
          discountType: true,
          amount: true,
          startAt: true,
          endAt: true,
        },
      },
    },
  });

  if (!event || event.status !== "PUBLISHED") {
    throw new NotFoundError("Event not found or not currently published");
  }

  return {
    ...event,
    ticketTypes: event.ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      priceIdr: t.priceIdr,
      availableQty: Math.max(0, t.quota - t.reservedQty - t.soldQty),
    })),
  };
}

export async function createOrganizerEvent(
  organizerId: string,
  data: {
    categoryId: string;
    title: string;
    description: string;
    bannerUrl?: string | null;
    location: string;
    city: string;
    startAt: Date;
    endAt: Date;
  },
) {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    throw new NotFoundError("Selected category not found");
  }

  const slug = slugify(data.title);

  return prisma.event.create({
    data: {
      organizerId,
      categoryId: data.categoryId,
      title: data.title,
      slug,
      description: data.description,
      bannerUrl: data.bannerUrl,
      location: data.location,
      city: data.city,
      startAt: data.startAt,
      endAt: data.endAt,
      status: "DRAFT",
    },
    include: {
      category: true,
      ticketTypes: true,
    },
  });
}

export async function updateOrganizerEvent(
  organizerId: string,
  eventId: string,
  data: {
    categoryId?: string;
    title?: string;
    description?: string;
    bannerUrl?: string | null;
    location?: string;
    city?: string;
    startAt?: Date;
    endAt?: Date;
  },
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  if (event.status === "COMPLETED" || event.status === "CANCELED") {
    throw new ValidationError(`Cannot update event in ${event.status} status`);
  }

  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new NotFoundError("Selected category not found");
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      ...data,
      slug: data.title ? slugify(data.title) : undefined,
    },
    include: {
      category: true,
      ticketTypes: true,
    },
  });
}

export async function publishOrganizerEvent(organizerId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true },
  });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  if (event.status !== "DRAFT") {
    throw new ValidationError(`Event cannot be published from status: ${event.status}`);
  }

  if (event.ticketTypes.length === 0) {
    throw new ValidationError("Cannot publish an event with no ticket types");
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
    include: { category: true, ticketTypes: true },
  });
}

export async function cancelOrganizerEvent(organizerId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  if (event.status === "COMPLETED" || event.status === "CANCELED") {
    throw new ValidationError(`Event cannot be canceled from status: ${event.status}`);
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { status: "CANCELED" },
  });
}

export async function createTicketType(
  organizerId: string,
  eventId: string,
  data: {
    name: string;
    description?: string | null;
    priceIdr: number;
    quota: number;
  },
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  if (event.status === "COMPLETED" || event.status === "CANCELED") {
    throw new ValidationError(`Cannot add ticket types to ${event.status} event`);
  }

  return prisma.ticketType.create({
    data: {
      eventId,
      name: data.name,
      description: data.description,
      priceIdr: data.priceIdr,
      quota: data.quota,
    },
  });
}

export async function updateTicketType(
  organizerId: string,
  ticketTypeId: string,
  data: {
    name?: string;
    description?: string | null;
    priceIdr?: number;
    quota?: number;
  },
) {
  const ticket = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { event: true },
  });
  if (!ticket) throw new NotFoundError("Ticket type not found");
  if (ticket.event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  if (data.quota !== undefined) {
    const minRequired = ticket.reservedQty + ticket.soldQty;
    if (data.quota < minRequired) {
      throw new ConflictError(
        `Capacity cannot drop below reserved+sold tickets (${minRequired})`,
      );
    }
  }

  return prisma.ticketType.update({
    where: { id: ticketTypeId },
    data,
  });
}

export async function createEventVoucher(
  organizerId: string,
  eventId: string,
  data: {
    code: string;
    discountType: "FIXED" | "PERCENT";
    amount: number;
    quota: number;
    startAt: Date;
    endAt: Date;
  },
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  const existing = await prisma.eventVoucher.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new ConflictError("Voucher code already in use");
  }

  return prisma.eventVoucher.create({
    data: {
      eventId,
      code: data.code,
      discountType: data.discountType,
      amount: data.amount,
      quota: data.quota,
      startAt: data.startAt,
      endAt: data.endAt,
    },
  });
}

export async function getEventVouchers(organizerId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  if (event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event");
  }

  return prisma.eventVoucher.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateEventVoucher(
  organizerId: string,
  voucherId: string,
  data: {
    amount?: number;
    quota?: number;
    startAt?: Date;
    endAt?: Date;
  },
) {
  const voucher = await prisma.eventVoucher.findUnique({
    where: { id: voucherId },
    include: { event: true },
  });
  if (!voucher) throw new NotFoundError("Voucher not found");
  if (voucher.event.organizerId !== organizerId) {
    throw new ForbiddenError("You do not own this event voucher");
  }

  if (data.quota !== undefined && data.quota < voucher.usedQty) {
    throw new ConflictError(`Voucher quota cannot drop below used quantity (${voucher.usedQty})`);
  }

  return prisma.eventVoucher.update({
    where: { id: voucherId },
    data,
  });
}
