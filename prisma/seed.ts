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
  // Customers
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

  // Event Organizers
  { name: "Organizer Alex", email: "alex.organizer@example.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Summit Events", email: "contact@summitevents.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Nexus Productions", email: "info@nexusproductions.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Horizon Festivals", email: "team@horizonfestivals.com", role: "EVENT_ORGANIZER", emailVerified: true },
  { name: "Echo Stage Media", email: "hello@echostage.com", role: "EVENT_ORGANIZER", emailVerified: true },
];

const DEFAULT_PASSWORD = "Password123!";

async function main() {
  console.log("Starting user seed...");

  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  for (const user of dummyUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`[SKIP] User with email ${user.email} already exists.`);
      continue;
    }

    const referralCode = generateReferralCode(user.name);

    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role ?? "CUSTOMER",
        referralCode,
        emailVerifiedAt: user.emailVerified ? new Date() : null,
      },
    });

    console.log(`[CREATED] ${created.role}: ${created.name} (${created.email}) [ID: ${created.id}]`);
  }

  console.log("\nDefault credentials for seeded users:");
  console.log(`Password: ${DEFAULT_PASSWORD}`);
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
