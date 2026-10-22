import { prisma } from "../db";
import { AuthenticationError } from "../errors";

/**
 * Get user profile by user ID (without password hash).
 * @param userId The unique ID of the user.
 */
export async function getUserProfileService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      referralCode: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AuthenticationError("User not found");
  }

  return user;
}
