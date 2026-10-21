import { randomBytes, createHash } from "crypto";

export function generateRefreshToken() {
    const token = randomBytes(40).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    return { token, hash };
}
