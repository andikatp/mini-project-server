import type { Request, Response } from "express";
import { SESSION_CONFIG } from "../configs/session.config.ts";
import {
  loginUserService,
  logoutService,
  registerUserService,
  requestPasswordReset,
  resendVerificationCodeService,
  resetPasswordService,
  verifyEmailService,
  verifyResetPasswordService,
} from "../services/auth.service";
import { sendSuccess } from "../utils/response";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
  VerifyResetPasswordInput,
} from "../validations/auth.validation";

export async function registerHandler(
  req: Request<{}, {}, RegisterInput>,
  res: Response,
) {
  const user = await registerUserService(req.body);
  sendSuccess(
    res,
    201,
    "Registration successful. A verification code has been sent to your email address. Please check your inbox.",
    user,
  );
}

export async function verifyEmailHandler(
  req: Request<{}, {}, VerifyEmailInput>,
  res: Response,
) {
  const result = await verifyEmailService(req.body);

  res.cookie(SESSION_CONFIG.cookieName, result.sessionToken, {
    httpOnly: true,
    secure: SESSION_CONFIG.secure,
    sameSite: "lax",
    maxAge: SESSION_CONFIG.maxAgeMs,
  });

  sendSuccess(res, 200, result.message, { user: result.user });
}

export async function resendVerificationHandler(
  req: Request<{}, {}, ResendVerificationInput>,
  res: Response,
) {
  const { email } = req.body;
  const result = await resendVerificationCodeService(email);
  sendSuccess(res, 200, result.message, null);
}

export async function loginHandler(
  req: Request<{}, {}, LoginInput>,
  res: Response,
) {
  const { email, password } = req.body;
  const { user, sessionToken } = await loginUserService({ email, password });

  res.cookie(SESSION_CONFIG.cookieName, sessionToken, {
    httpOnly: true,
    secure: SESSION_CONFIG.secure,
    sameSite: "lax",
    maxAge: SESSION_CONFIG.maxAgeMs,
  });

  sendSuccess(res, 200, "User logged in successfully", { user });
}

export { getMeHandler } from "./user.controller";

export async function logoutHandler(req: Request, res: Response) {
  const sessionToken = req.cookies?.[SESSION_CONFIG.cookieName];

  if (sessionToken) {
    await logoutService(sessionToken);
  }

  res.clearCookie(SESSION_CONFIG.cookieName, {
    httpOnly: true,
    secure: SESSION_CONFIG.secure,
    sameSite: "lax",
  });

  sendSuccess(res, 200, "Logged out successfully", null);
}

export async function forgotPasswordHandler(
  req: Request<{}, {}, ForgotPasswordInput>,
  res: Response,
) {
  const { email } = req.body;
  await requestPasswordReset(email);
  sendSuccess(
    res,
    200,
    "If your email is registered, you will receive a password reset code shortly.",
    null,
  );
}

export async function verifyResetPasswordHandler(
  req: Request<{}, {}, VerifyResetPasswordInput>,
  res: Response,
) {
  const result = await verifyResetPasswordService(req.body);
  sendSuccess(res, 200, result.message, { resetToken: result.resetToken });
}

export async function resetPasswordHandler(
  req: Request<{}, {}, ResetPasswordInput>,
  res: Response,
) {
  const result = await resetPasswordService(req.body);
  sendSuccess(res, 200, result.message, null);
}
