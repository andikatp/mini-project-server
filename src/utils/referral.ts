import { randomBytes } from "node:crypto";

export function generateReferralCode(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanName = (sanitized.slice(0, 5) || "USER");
  const randomSuffix = randomBytes(3).toString("hex").toUpperCase();
  return `${cleanName}-${randomSuffix}`;
}
