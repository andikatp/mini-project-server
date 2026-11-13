import argon2 from "argon2";
import { prisma } from "../src/db";
import { generateReferralCode } from "../src/utils/referral";

interface DummyUserOptions {
  name: string;
  email: string;
  role?: "CUSTOMER" | "EVENT_ORGANIZER";
  emailVerified?: boolean;
}

const dummyUsers: DummyUserOptions[] = [
  {
    name: "Menyusuri Ruang Hati",
    email: "menyusuriruanghati@gmail.com",
    role: "EVENT_ORGANIZER",
    emailVerified: true,
  },
  { name: "Organizer Alex", email: "alex.organizer@example.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Summit Events", email: "contact@summitevents.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Nexus Productions", email: "info@nexusproductions.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Horizon Festivals", email: "team@horizonfestivals.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Echo Stage Media", email: "hello@echostage.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "John Doe", email: "john.doe@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Jane Smith", email: "jane.smith@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Michael Brown", email: "michael.brown@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Emily Davis", email: "emily.davis@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "David Wilson", email: "david.wilson@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Sarah Taylor", email: "sarah.taylor@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "James Anderson", email: "james.anderson@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Olivia Thomas", email: "olivia.thomas@example.com", role: "CUSTOMER", emailVerified: false },
  { name: "Daniel Martinez", email: "daniel.martinez@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Sophia Garcia", email: "sophia.garcia@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Matthew Robinson", email: "matthew.robinson@example.com", role: "CUSTOMER", emailVerified: false },
  { name: "Emma Clark", email: "emma.clark@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Budi Santoso", email: "budi.santoso@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Siti Rahma", email: "siti.rahma@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Reza Pratama", email: "reza.pratama@example.com", role: "CUSTOMER", emailVerified: true },
  { name: "Nadia Utami", email: "nadia.utami@example.com", role: "CUSTOMER", emailVerified: true },
];

const DEFAULT_PASSWORD = "Password123!";

const categories = [
  { name: "Concert & Music", slug: "concert-music" },
  { name: "Festival & Culture", slug: "festival-culture" },
  { name: "Workshop & Seminar", slug: "workshop-seminar" },
  { name: "Exhibition & Expo", slug: "exhibition-expo" },
  { name: "Sports & Fitness", slug: "sports-fitness" },
];

async function main() {
  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    categoryMap.set(cat.slug, category.id);
  }

  const createdUsers: Record<string, any> = {};

  for (const user of dummyUsers) {
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      const referralCode = generateReferralCode(user.name);
      dbUser = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role ?? "CUSTOMER",
          referralCode,
          emailVerifiedAt: user.emailVerified ? new Date() : null,
        },
      });
    }

    createdUsers[user.email] = dbUser;
  }

  const primaryOrganizer = createdUsers["menyusuriruanghati@gmail.com"];
  const customerList = Object.values(createdUsers).filter((u: any) => u.role === "CUSTOMER");

  if (!primaryOrganizer) {
    throw new Error("Primary organizer menyusuriruanghati@gmail.com not created!");
  }

  const eventsData = [
    {
      title: "Konser Menyusuri Ruang Hati Vol. 1 - Melodi Jiwa",
      slug: "konser-menyusuri-ruang-hati-vol-1",
      description: "Malam keintiman musik akustik dan ruang berekspresi bersama musisi indie ternama.",
      bannerUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
      location: "Teater Salihara, Pasar Minggu",
      city: "Jakarta Selatan",
      status: "COMPLETED" as const,
      categorySlug: "concert-music",
      daysAgo: 75,
      ticketTiers: [
        { name: "Early Bird", priceIdr: 125000, quota: 100, soldQty: 100 },
        { name: "Regular Tribune", priceIdr: 185000, quota: 150, soldQty: 140 },
        { name: "VIP Intimate Seat", priceIdr: 350000, quota: 50, soldQty: 48 },
      ],
      targetDoneTransactions: 16,
    },
    {
      title: "Festival Puisi & Musik: Dekap Ruang Hati",
      slug: "festival-puisi-musik-dekap-ruang-hati",
      description: "Festival kolaborasi puisi, seni visual, dan alunan melodi penyembuh rasa.",
      bannerUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80",
      location: "Taman Budaya Yogyakarta",
      city: "Yogyakarta",
      status: "COMPLETED" as const,
      categorySlug: "festival-culture",
      daysAgo: 40,
      ticketTiers: [
        { name: "Presale Festival", priceIdr: 95000, quota: 200, soldQty: 195 },
        { name: "General Admission", priceIdr: 150000, quota: 250, soldQty: 220 },
      ],
      targetDoneTransactions: 18,
    },
    {
      title: "Konser Menyusuri Ruang Hati Vol. 2 - Pulang",
      slug: "konser-menyusuri-ruang-hati-vol-2",
      description: "Kelanjutan perjalanan ruang hati dengan penampilan orkestra akustik.",
      bannerUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
      location: "Balai Sarbini, Semanggi",
      city: "Jakarta Pusat",
      status: "PUBLISHED" as const,
      categorySlug: "concert-music",
      daysAgo: -20,
      ticketTiers: [
        { name: "Early Bird", priceIdr: 175000, quota: 150, soldQty: 150 },
        { name: "Regular Seat", priceIdr: 250000, quota: 300, soldQty: 180 },
        { name: "VIP + Soundcheck Experience", priceIdr: 500000, quota: 75, soldQty: 55 },
      ],
      targetDoneTransactions: 15,
      includePendingProofs: true,
    },
    {
      title: "Workshop Menulis Narasi Jiwa & Songwriting",
      slug: "workshop-menulis-narasi-jiwa",
      description: "Kelas interaktif membedah lirik dan komposisi bersama para penulis lirik ruang hati.",
      bannerUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80",
      location: "Dia.Lo.Gue Artspace, Kemang",
      city: "Jakarta Selatan",
      status: "PUBLISHED" as const,
      categorySlug: "workshop-seminar",
      daysAgo: -10,
      ticketTiers: [
        { name: "General Participant", priceIdr: 300000, quota: 40, soldQty: 28 },
      ],
      targetDoneTransactions: 8,
      includePendingProofs: true,
    },
  ];

  const now = new Date();

  for (const ev of eventsData) {
    const categoryId = categoryMap.get(ev.categorySlug) || Array.from(categoryMap.values())[0];
    if (!categoryId) {
      throw new Error(`Category not found for slug: ${ev.categorySlug}`);
    }

    const startAt = new Date(now.getTime() - ev.daysAgo * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);

    const event = await prisma.event.upsert({
      where: { slug: ev.slug },
      update: {
        title: ev.title,
        description: ev.description,
        bannerUrl: ev.bannerUrl,
        location: ev.location,
        city: ev.city,
        status: ev.status,
        startAt,
        endAt,
      },
      create: {
        organizerId: primaryOrganizer.id,
        categoryId,
        title: ev.title,
        slug: ev.slug,
        description: ev.description,
        bannerUrl: ev.bannerUrl,
        location: ev.location,
        city: ev.city,
        status: ev.status,
        startAt,
        endAt,
      },
    });

    const createdTickets = [];
    for (const t of ev.ticketTiers) {
      let ticket = await prisma.ticketType.findFirst({
        where: { eventId: event.id, name: t.name },
      });
      if (!ticket) {
        ticket = await prisma.ticketType.create({
          data: {
            eventId: event.id,
            name: t.name,
            priceIdr: t.priceIdr,
            quota: t.quota,
            soldQty: t.soldQty,
            reservedQty: 0,
          },
        });
      }
      createdTickets.push(ticket);
    }

    const existingTxCount = await prisma.transaction.count({
      where: { eventId: event.id },
    });

    if (existingTxCount >= 5) {
      continue;
    }

    for (let i = 0; i < ev.targetDoneTransactions; i++) {
      const customer = customerList[i % customerList.length];
      const selectedTicket = createdTickets[i % createdTickets.length];
      if (!customer || !selectedTicket) continue;
      const qty = (i % 3) + 1;
      const subtotal = selectedTicket.priceIdr * qty;
      const total = subtotal;

      const daysOffset = Math.floor((ev.daysAgo > 0 ? ev.daysAgo : 10) + (i * 3.5)) % 88;
      const txDate = new Date(now.getTime() - daysOffset * 24 * 60 * 60 * 1000 - (i * 3600000));
      const txCode = `TRX-${event.slug.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${i + 1}`;

      await prisma.transaction.create({
        data: {
          code: txCode,
          customerId: customer.id,
          eventId: event.id,
          status: "DONE",
          subtotalIdr: subtotal,
          totalIdr: total,
          paymentExpiresAt: new Date(txDate.getTime() + 2 * 3600000),
          proofUploadedAt: new Date(txDate.getTime() + 1800000),
          createdAt: txDate,
          updatedAt: new Date(txDate.getTime() + 3600000),
          items: {
            create: {
              ticketTypeId: selectedTicket.id,
              ticketName: selectedTicket.name,
              priceIdr: selectedTicket.priceIdr,
              quantity: qty,
              subtotalIdr: subtotal,
              createdAt: txDate,
            },
          },
          paymentProof: {
            create: {
              fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              reviewedByUserId: primaryOrganizer.id,
              reviewedAt: new Date(txDate.getTime() + 3600000),
              uploadedAt: new Date(txDate.getTime() + 1800000),
            },
          },
        },
      });

      if (ev.status === "COMPLETED" && i % 2 === 0) {
        const ratings = [5, 5, 4, 5, 4];
        const comments = [
          "Konsernya syahdu banget, aransemen musiknya juara!",
          "Suasana intim dan sangat berkesan, recommended buat healing.",
          "Tata suaranya bagus sekali. Puas banget nonton dari awal sampai akhir.",
          "Menyentuh hati sesuai namanya. Ditunggu volume berikutnya!",
        ];
        await prisma.review.upsert({
          where: {
            customerId_eventId: {
              customerId: customer.id,
              eventId: event.id,
            },
          },
          update: {},
          create: {
            customerId: customer.id,
            eventId: event.id,
            rating: ratings[i % ratings.length] ?? 5,
            comment: comments[i % comments.length] ?? "Acara yang luar biasa!",
            status: "APPROVED",
            reviewedByUserId: primaryOrganizer.id,
            createdAt: new Date(txDate.getTime() + 24 * 3600000),
          },
        });
      }
    }

    if (ev.includePendingProofs && createdTickets.length > 0) {
      const waitingCust = customerList[(customerList.length - 1) % customerList.length];
      const t = createdTickets[0];
      if (!t || !waitingCust) continue;
      await prisma.transaction.create({
        data: {
          code: `TRX-${event.slug.substring(0, 8).toUpperCase()}-CONFIRM-1`,
          customerId: waitingCust.id,
          eventId: event.id,
          status: "WAITING_FOR_ADMIN_CONFIRMATION",
          subtotalIdr: t.priceIdr * 2,
          totalIdr: t.priceIdr * 2,
          paymentExpiresAt: new Date(now.getTime() + 3600000),
          proofUploadedAt: new Date(now.getTime() - 1800000),
          confirmationDueAt: new Date(now.getTime() + 3 * 24 * 3600000),
          createdAt: new Date(now.getTime() - 2500000),
          items: {
            create: {
              ticketTypeId: t.id,
              ticketName: t.name,
              priceIdr: t.priceIdr,
              quantity: 2,
              subtotalIdr: t.priceIdr * 2,
            },
          },
          paymentProof: {
            create: {
              fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              uploadedAt: new Date(now.getTime() - 1800000),
            },
          },
        },
      });

      const payCust = customerList[(customerList.length - 2) % customerList.length];
      await prisma.transaction.create({
        data: {
          code: `TRX-${event.slug.substring(0, 8).toUpperCase()}-PAY-1`,
          customerId: payCust.id,
          eventId: event.id,
          status: "WAITING_FOR_PAYMENT",
          subtotalIdr: t.priceIdr,
          totalIdr: t.priceIdr,
          paymentExpiresAt: new Date(now.getTime() + 5400000),
          createdAt: new Date(now.getTime() - 1200000),
          items: {
            create: {
              ticketTypeId: t.id,
              ticketName: t.name,
              priceIdr: t.priceIdr,
              quantity: 1,
              subtotalIdr: t.priceIdr,
            },
          },
        },
      });
    }
  }

  const johnDoe = createdUsers["john.doe@example.com"];
  const janeSmith = createdUsers["jane.smith@example.com"];

  if (johnDoe) {
    const existingPoints = await prisma.pointCredit.count({
      where: { userId: johnDoe.id },
    });
    if (existingPoints === 0) {
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      await prisma.pointCredit.createMany({
        data: [
          {
            userId: johnDoe.id,
            initialAmount: 10000,
            remainingAmount: 10000,
            issuedAt: now,
            expiresAt,
          },
          {
            userId: johnDoe.id,
            initialAmount: 20000,
            remainingAmount: 20000,
            issuedAt: now,
            expiresAt,
          },
        ],
      });
    }

    const existingCoupon = await prisma.systemCoupon.findFirst({
      where: { userId: johnDoe.id, code: "WELCOME-JOHNDOE" },
    });
    if (!existingCoupon) {
      await prisma.systemCoupon.create({
        data: {
          userId: johnDoe.id,
          code: "WELCOME-JOHNDOE",
          status: "AVAILABLE",
          issuedAt: now,
          expiredAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  if (janeSmith) {
    const existingPoints = await prisma.pointCredit.count({
      where: { userId: janeSmith.id },
    });
    if (existingPoints === 0) {
      const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      await prisma.pointCredit.create({
        data: {
          userId: janeSmith.id,
          initialAmount: 15000,
          remainingAmount: 15000,
          issuedAt: now,
          expiresAt,
        },
      });
    }

    const existingCoupon = await prisma.systemCoupon.findFirst({
      where: { userId: janeSmith.id, code: "WELCOME-JANESMITH" },
    });
    if (!existingCoupon) {
      await prisma.systemCoupon.create({
        data: {
          userId: janeSmith.id,
          code: "WELCOME-JANESMITH",
          status: "AVAILABLE",
          issuedAt: now,
          expiredAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  const publishedEvents = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
  });

  for (const event of publishedEvents) {
    const voucherCode = `HEMAT-${event.slug.substring(0, 6).toUpperCase()}`;
    const existingVoucher = await prisma.eventVoucher.findUnique({
      where: { code: voucherCode },
    });
    if (!existingVoucher) {
      await prisma.eventVoucher.create({
        data: {
          eventId: event.id,
          code: voucherCode,
          discountType: "FIXED",
          amount: 25000,
          quota: 100,
          usedQty: 0,
          startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  const publishedEventList = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    include: { ticketTypes: true },
  });

  if (publishedEventList.length > 0) {
    const ev1 = publishedEventList[0]!;
    const ev2 = publishedEventList[1] || ev1;
    const t1 = ev1.ticketTypes[0]!;
    const t2 = ev2.ticketTypes[0]!;

    if (johnDoe) {
      const johnTxs = [
        {
          code: `TRX-${ev1.slug.substring(0, 8).toUpperCase()}-JD-REJECT-1`,
          status: "REJECTED" as const,
          event: ev1,
          ticket: t1,
          qty: 2,
          hoursAgo: 60,
          proof: {
            reason: "Bukti transfer tidak terbaca dan nominal tidak sesuai.",
            delayMin: 30,
          },
        },
        {
          code: `TRX-${ev2.slug.substring(0, 8).toUpperCase()}-JD-EXPIRE-1`,
          status: "EXPIRED" as const,
          event: ev2,
          ticket: t2,
          qty: 1,
          hoursAgo: 36,
        },
        {
          code: `TRX-${ev1.slug.substring(0, 8).toUpperCase()}-JD-CANCEL-1`,
          status: "CANCELED" as const,
          event: ev1,
          ticket: t1,
          qty: 1,
          hoursAgo: 18,
          rollback: true,
        },
        {
          code: `TRX-${ev2.slug.substring(0, 8).toUpperCase()}-JD-WAITPAY-1`,
          status: "WAITING_FOR_PAYMENT" as const,
          event: ev2,
          ticket: t2,
          qty: 1,
          hoursAgo: 0.5,
        },
        {
          code: `TRX-${ev1.slug.substring(0, 8).toUpperCase()}-JD-CONFIRM-1`,
          status: "WAITING_FOR_ADMIN_CONFIRMATION" as const,
          event: ev1,
          ticket: t1,
          qty: 1,
          hoursAgo: 1,
          proof: {
            delayMin: 15,
          },
        },
      ];

      for (const item of johnTxs) {
        const existing = await prisma.transaction.findUnique({ where: { code: item.code } });
        if (!existing) {
          const txTime = new Date(now.getTime() - item.hoursAgo * 3600000);
          const subtotal = item.ticket.priceIdr * item.qty;
          await prisma.transaction.create({
            data: {
              code: item.code,
              customerId: johnDoe.id,
              eventId: item.event.id,
              status: item.status,
              subtotalIdr: subtotal,
              totalIdr: subtotal,
              paymentExpiresAt: new Date(txTime.getTime() + 2 * 3600000),
              proofUploadedAt: item.proof ? new Date(txTime.getTime() + item.proof.delayMin * 60000) : null,
              confirmationDueAt: item.status === "WAITING_FOR_ADMIN_CONFIRMATION" ? new Date(now.getTime() + 3 * 24 * 3600000) : null,
              rollbackProcessedAt: item.rollback ? new Date(txTime.getTime() + 1800000) : null,
              createdAt: txTime,
              updatedAt: new Date(txTime.getTime() + 1800000),
              items: {
                create: {
                  ticketTypeId: item.ticket.id,
                  ticketName: item.ticket.name,
                  priceIdr: item.ticket.priceIdr,
                  quantity: item.qty,
                  subtotalIdr: subtotal,
                  createdAt: txTime,
                },
              },
              ...(item.proof
                ? {
                    paymentProof: {
                      create: {
                        fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
                        uploadedAt: new Date(txTime.getTime() + item.proof.delayMin * 60000),
                        reviewedByUserId: item.proof.reason ? primaryOrganizer.id : null,
                        reviewedAt: item.proof.reason ? new Date(txTime.getTime() + 4500000) : null,
                        rejectionReason: item.proof.reason || null,
                      },
                    },
                  }
                : {}),
            },
          });
        }
      }
    }

    if (customerList.length >= 6) {
      const ev = publishedEventList[0]!;
      const ticket = ev.ticketTypes[0]!;

      const rejectedCust = customerList[2]!;
      const expiredCust = customerList[3]!;
      const canceledCust = customerList[4]!;

      const rejectedTxCode = `TRX-${ev.slug.substring(0, 8).toUpperCase()}-REJECTED-1`;
      const existingRejected = await prisma.transaction.findUnique({ where: { code: rejectedTxCode } });
      if (!existingRejected) {
        const txTime = new Date(now.getTime() - 48 * 3600000);
        await prisma.transaction.create({
          data: {
            code: rejectedTxCode,
            customerId: rejectedCust.id,
            eventId: ev.id,
            status: "REJECTED",
            subtotalIdr: ticket.priceIdr * 2,
            totalIdr: ticket.priceIdr * 2,
            paymentExpiresAt: new Date(txTime.getTime() + 2 * 3600000),
            proofUploadedAt: new Date(txTime.getTime() + 1800000),
            createdAt: txTime,
            updatedAt: new Date(txTime.getTime() + 5000000),
            items: {
              create: {
                ticketTypeId: ticket.id,
                ticketName: ticket.name,
                priceIdr: ticket.priceIdr,
                quantity: 2,
                subtotalIdr: ticket.priceIdr * 2,
                createdAt: txTime,
              },
            },
            paymentProof: {
              create: {
                fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
                reviewedByUserId: primaryOrganizer.id,
                reviewedAt: new Date(txTime.getTime() + 5000000),
                uploadedAt: new Date(txTime.getTime() + 1800000),
                rejectionReason: "Bukti transfer buram dan nominal tidak sesuai.",
              },
            },
          },
        });
      }

      const expiredTxCode = `TRX-${ev.slug.substring(0, 8).toUpperCase()}-EXPIRED-1`;
      const existingExpired = await prisma.transaction.findUnique({ where: { code: expiredTxCode } });
      if (!existingExpired) {
        const txTime = new Date(now.getTime() - 24 * 3600000);
        await prisma.transaction.create({
          data: {
            code: expiredTxCode,
            customerId: expiredCust.id,
            eventId: ev.id,
            status: "EXPIRED",
            subtotalIdr: ticket.priceIdr,
            totalIdr: ticket.priceIdr,
            paymentExpiresAt: new Date(txTime.getTime() + 2 * 3600000),
            createdAt: txTime,
            updatedAt: new Date(txTime.getTime() + 2 * 3600000),
            items: {
              create: {
                ticketTypeId: ticket.id,
                ticketName: ticket.name,
                priceIdr: ticket.priceIdr,
                quantity: 1,
                subtotalIdr: ticket.priceIdr,
                createdAt: txTime,
              },
            },
          },
        });
      }

      const canceledTxCode = `TRX-${ev.slug.substring(0, 8).toUpperCase()}-CANCELED-1`;
      const existingCanceled = await prisma.transaction.findUnique({ where: { code: canceledTxCode } });
      if (!existingCanceled) {
        const txTime = new Date(now.getTime() - 12 * 3600000);
        await prisma.transaction.create({
          data: {
            code: canceledTxCode,
            customerId: canceledCust.id,
            eventId: ev.id,
            status: "CANCELED",
            subtotalIdr: ticket.priceIdr,
            totalIdr: ticket.priceIdr,
            paymentExpiresAt: new Date(txTime.getTime() + 2 * 3600000),
            rollbackProcessedAt: new Date(txTime.getTime() + 1800000),
            createdAt: txTime,
            updatedAt: new Date(txTime.getTime() + 1800000),
            items: {
              create: {
                ticketTypeId: ticket.id,
                ticketName: ticket.name,
                priceIdr: ticket.priceIdr,
                quantity: 1,
                subtotalIdr: ticket.priceIdr,
                createdAt: txTime,
              },
            },
          },
        });
      }
    }
  }

  const additionalCouponUsers = [
    { email: "michael.brown@example.com", points: 20000, couponCode: "WELCOME-MICHAEL" },
    { email: "emily.davis@example.com", points: 10000, couponCode: "WELCOME-EMILY" },
    { email: "sarah.taylor@example.com", points: 50000, couponCode: "WELCOME-SARAH" },
  ];

  for (const item of additionalCouponUsers) {
    const u = createdUsers[item.email];
    if (u) {
      const pCount = await prisma.pointCredit.count({ where: { userId: u.id } });
      if (pCount === 0) {
        await prisma.pointCredit.create({
          data: {
            userId: u.id,
            initialAmount: item.points,
            remainingAmount: item.points,
            issuedAt: now,
            expiresAt: new Date(now.getTime() + 90 * 24 * 3600000),
          },
        });
      }

      const cExists = await prisma.systemCoupon.findFirst({ where: { userId: u.id, code: item.couponCode } });
      if (!cExists) {
        await prisma.systemCoupon.create({
          data: {
            userId: u.id,
            code: item.couponCode,
            status: "AVAILABLE",
            issuedAt: now,
            expiredAt: new Date(now.getTime() + 90 * 24 * 3600000),
          },
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
