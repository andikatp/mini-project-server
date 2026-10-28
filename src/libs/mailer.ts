import { Resend } from "resend";
import { MAIL_CONFIG } from "../configs/mail.config.ts";
import { logger } from "./logger.ts";

const resend = new Resend(MAIL_CONFIG.apiKey || "re_dummy_fallback_key");

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!MAIL_CONFIG.apiKey) {
    logger.warn(
      `[RESEND NOT CONFIGURED] Email to: ${to} | Subject: ${subject}`,
    );
    logger.debug(`[EMAIL CONTENT]\n${text || html}`);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: MAIL_CONFIG.from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      if ((error as any).statusCode === 403) {
        logger.warn(
          `[Resend Sandbox Limitation] Resend in test mode only allows sending to your registered account email (triprasetya_andika@yahoo.com). To send to any recipient, verify your domain at https://resend.com/domains and update EMAIL_FROM in .env.`,
        );
      }
      logger.error(`Resend error sending email to ${to}:`, error);
      throw error;
    }

    logger.info(`Email sent to ${to} via Resend: ${data?.id}`);
    return data;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

export async function sendVerificationEmail(email: string, otp: string) {
  logger.info(`[EMAIL VERIFICATION OTP] To: ${email} -> Code: ${otp}`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b; margin-top: 0;">Welcome to EventMgmt!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Thank you for registering. Use the 6-digit verification code below to activate your account:</p>
      <div style="margin: 28px 0; text-align: center;">
        <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #eff6ff; padding: 14px 28px; border-radius: 8px; border: 1px dashed #bfdbfe;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-bottom: 4px;">This verification code <strong>expires in 10 minutes</strong> and allows at most 5 attempts.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you did not register for an EventMgmt account, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Verify your email address - EventMgmt",
    html,
    text: `Your EventMgmt verification code is: ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  logger.info(`[PASSWORD RESET OTP] To: ${email} -> Code: ${otp}`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">We received a request to reset your password for EventMgmt. Use the 6-digit code below to set a new password:</p>
      <div style="margin: 28px 0; text-align: center;">
        <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #eff6ff; padding: 14px 28px; border-radius: 8px; border: 1px dashed #bfdbfe;">
          ${otp}
        </span>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-bottom: 4px;">This reset code <strong>expires in 10 minutes</strong> and allows at most 5 attempts.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Reset your password - EventMgmt",
    html,
    text: `Your EventMgmt password reset code is: ${otp}. It expires in 10 minutes.`,
  });
}
