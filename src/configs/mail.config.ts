const primaryClientUrl = (
  process.env.CLIENT_URL ||
  process.env.CLIENT_ORIGIN ||
  "http://localhost:3000"
)
  .split(",")[0]!
  .trim();

export const MAIL_CONFIG = {
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.EMAIL_FROM || "EventMgmt <noreply@andikatp.dev>",
  clientUrl: primaryClientUrl,
} as const;
