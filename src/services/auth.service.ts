import argon2 from "argon2";
import { prisma } from "../db";
import { createHash, randomBytes } from "crypto";
import type { LoginInput, RegisterInput } from "../validations/auth.validation";
import type { Prisma } from "@prisma/client/extension";
import { REFRESH_TOKEN_EXPIRES_DAYS } from "../config";
import { AuthenticationError, ConflictError, TokenError, ValidationError } from "../errors";
import { generateReferralCode } from "../utils/referral";
import { createAccessToken } from "../utils/jwt";
import { generateRefreshToken } from "../utils/refreshToken";


export async function registerUserService(input: RegisterInput) {
    const { email, password, name, role, referralCode } = input;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new ConflictError("Email is already registered");
    }

    const hashedPassword = await argon2.hash(password);

    let referrerId: string | null = null;
    if (referralCode) {
        const referrer = await prisma.user.findUnique({
            where: { referralCode },
        });

        if (!referrer) {
            throw new ValidationError("Invalid referral code");
        }
        referrerId = referrer.id;
    }

    let newReferralCode = generateReferralCode(name);
    let codeExists = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
    while (codeExists) {
        newReferralCode = generateReferralCode(name);
        codeExists = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
    }
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role,
                referralCode: newReferralCode,
                referredByUserId: referrerId,
            },
        });

        if (referrerId) {
            const now = new Date();
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 3);

            // Give referrer 10,000 points
            await tx.pointCredit.create({
                data: {
                    userId: referrerId,
                    initialAmount: 10000,
                    remainingAmount: 10000,
                    issuedAt: now,
                    expiresAt: expiresAt,
                },
            });

            // Give new user a system coupon
            await tx.systemCoupon.create({
                data: {
                    userId: user.id,
                    code: `WELCOME-${randomBytes(3).toString("hex").toUpperCase()}`,
                    status: "AVAILABLE",
                    issuedAt: now,
                    expiresAt: expiresAt,
                },
            });
        }

        return user;
    });

    const { passwordHash, ...userWithoutPassword } = result;
    return userWithoutPassword;
}

/**
 * Authenticate a user and issue JWT tokens.
 * @param input Login credentials.
 * @returns Auth payload containing user (without password), access token and refresh token.
 */
export async function loginUserService(input: LoginInput) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AuthenticationError("Invalid email or password");
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
    }

    const accessToken = await createAccessToken({ userId: user.id, role: user.role });

    const { token, hash } = generateRefreshToken();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await prisma.refreshToken.create({
        data: {
            tokenHash: hash,
            userId: user.id,
            expiresAt: refreshExpiresAt,
        },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        access_token: accessToken,
        refresh_token: token,
    };
}

/**
 * Refresh an access token using a valid refresh token.
 * @param incomingRefreshToken The raw refresh token string sent by client.
 * @returns New access token.
 */
export async function refreshAccessTokenService(incomingRefreshToken: string) {
    const incomingHash = createHash("sha256").update(incomingRefreshToken).digest("hex");
    const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: incomingHash },
        include: { user: true },
    });

    if (!storedToken) {
        throw new TokenError("Invalid refresh token");
    }

    if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new TokenError("Refresh token expired");
    }

    const newAccessToken = await createAccessToken({
        userId: storedToken.user.id,
        role: storedToken.user.role,
    });

    return { access_token: newAccessToken } as const;
}

/** Placeholder for password reset request */
export async function requestPasswordReset(email: string): Promise<void> {
    // TODO: implement password reset flow
}

/** Placeholder for email verification */
export async function verifyEmail(token: string): Promise<void> {
    // TODO: implement email verification flow
}

/** Exported authentication service */
export const authService = {
    registerUserService,
    loginUserService,
    refreshAccessTokenService,
    requestPasswordReset,
    verifyEmail,
};