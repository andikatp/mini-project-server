import type { Request, Response } from "express";
import { loginUserService, refreshAccessTokenService, registerUserService } from "../services/auth.service";
import type { RegisterInput } from "../validations/auth.validation";
import { sendSuccess } from "../utils/response";

export async function registerHandler(req: Request<{}, {}, RegisterInput>, res: Response) {
    const user = await registerUserService(req.body);
    sendSuccess(res, 201, "User registered successfully", user);
}

export async function loginHandler(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await loginUserService({ email, password });
    sendSuccess(res, 200, "User logged in successfully", result);
}

export async function refreshAccessTokenHandler(req: Request, res: Response) {
    const { refresh_token } = req.body;
    const result = await refreshAccessTokenService(refresh_token);
    sendSuccess(res, 200, "Access token refreshed successfully", result);
}