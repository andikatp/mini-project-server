import type { Request, Response } from "express";
import { SESSION_CONFIG } from "../configs/session.config.ts";
import {
  loginUserService,
  logoutService,
  registerUserService,
  requestPasswordReset,
  resetPasswordService,
  verifyEmailService,
} from "../services/auth.service";
import { sendSuccess } from "../utils/response";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../validations/auth.validation";

export async function registerHandler(
  req: Request<{}, {}, RegisterInput>,
  res: Response,
) {
  const user = await registerUserService(req.body);
  sendSuccess(
    res,
    201,
    "Registration successful. A verification email has been sent to your email address. Please check your inbox.",
    user,
  );
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const { token } = req.body;
  const result = await verifyEmailService(token);
  sendSuccess(res, 200, result.message, null);
}

export async function loginHandler(
  req: Request<{}, {}, LoginInput>,
  res: Response,
) {
  const { email, password } = req.body;
  const { user, sessionToken } = await loginUserService({ email, password });

  // Set secure HttpOnly cookie
  res.cookie(SESSION_CONFIG.cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
    secure: true,
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
    "If your email is registered, you will receive a password reset link shortly.",
    null,
  );
}

export async function resetPasswordHandler(
  req: Request<{}, {}, ResetPasswordInput>,
  res: Response,
) {
  const { token, password } = req.body;
  const result = await resetPasswordService(token, password);
  sendSuccess(res, 200, result.message, null);
}
