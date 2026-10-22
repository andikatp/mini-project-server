export const MAIL_CONFIG = {
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.EMAIL_FROM || "EventMgmt <onboarding@resend.dev>",
  clientUrl: process.env.CLIENT_ORIGIN || "http://localhost:3000",
} as const;
