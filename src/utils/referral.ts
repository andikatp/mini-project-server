import { randomBytes } from "crypto";

export function generateReferralCode(name: string): string {
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5);
  const randomSuffix = randomBytes(2).toString("hex").toUpperCase();
  return `${cleanName}-${randomSuffix}`;
}
