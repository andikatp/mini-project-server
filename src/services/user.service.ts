import { prisma } from "../db";
import { AuthenticationError } from "../errors";
import type { UpdateProfileInput } from "../validations/user.validation";

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

/**
 * Update user profile (e.g. name, avatarUrl).
 * @param userId The unique ID of the user.
 * @param data Name and/or avatarUrl to update.
 */
export async function updateUserProfileService(
  userId: string,
  data: UpdateProfileInput,
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      referralCode: true,
      emailVerifiedAt: true,
      updatedAt: true,
    },
  });

  return user;
}
