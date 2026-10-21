import { SignJWT } from "jose";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config";

export async function createAccessToken(payload: { userId: string; role: string }) {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(secretKey);
}
