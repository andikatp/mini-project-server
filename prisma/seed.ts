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
  console.log("--- Starting Seed ---");
  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  console.log("Seeding categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
    categoryMap.set(cat.slug, category.id);
  }

  console.log("Seeding users...");
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
      console.log(`[CREATED] ${dbUser.role}: ${dbUser.name} (${dbUser.email})`);
    } else {
      console.log(`[EXISTING] ${dbUser.role}: ${dbUser.name} (${dbUser.email})`);
    }

    createdUsers[user.email] = dbUser;
  }

  const primaryOrganizer = createdUsers["menyusuriruanghati@gmail.com"];
  const customerList = Object.values(createdUsers).filter((u: any) => u.role === "CUSTOMER");

  if (!primaryOrganizer) {
    throw new Error("Primary organizer menyusuriruanghati@gmail.com not created!");
  }

  console.log(`Seeding events and historical transactions for organizer: ${primaryOrganizer.email}...`);

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

    console.log(`[EVENT] ${event.title} (${event.status})`);

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
      console.log(`[SKIP TX] Event ${event.title} already has ${existingTxCount} transactions.`);
      continue;
    }

    console.log(`Seeding transactions for ${event.title}...`);

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

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
