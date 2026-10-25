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

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${MAIL_CONFIG.clientUrl}/verify-email?token=${token}`;

  logger.info(`[EMAIL VERIFICATION LINK] To: ${email} -> ${verifyUrl}`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Welcome to EventMgmt!</h2>
      <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:</p>
      <p style="color: #64748b; font-size: 13px; word-break: break-all;">${verifyUrl}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Verify your email address - EventMgmt",
    html,
    text: `Please verify your email address by opening this link: ${verifyUrl}`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${MAIL_CONFIG.clientUrl}/reset-password?token=${token}`;

  logger.info(`[PASSWORD RESET LINK] To: ${email} -> ${resetUrl}`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your password for EventMgmt. Click the button below to choose a new password:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:</p>
      <p style="color: #64748b; font-size: 13px; word-break: break-all;">${resetUrl}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: "Reset your password - EventMgmt",
    html,
    text: `Please reset your password by opening this link: ${resetUrl}`,
  });
}
