import type { Request, Response } from "express";
import { loginUserService, refreshAccessTokenService, registerUserService } from "../services/auth.service";
import type { RegisterInput } from "../validations/auth.validation";

export async function registerHandler(req: Request<{}, {}, RegisterInput>, res: Response) {
    try {
        const user = await registerUserService(req.body);
        res.status(201).json({
            status: "success",
            message: "User registered successfully",
            data: user
        });
    } catch (error: any) {
        res.status(400).json({ status: "error", message: error.message || "An error occurred during registration" });
    }
}

export async function loginHandler(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await loginUserService({ email, password });
        res.status(200).json({
            status: "success",
            message: "User logged in successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(401).json({ status: "error", message: error.message || "Invalid email or password" });
    }
}

export async function refreshAccessTokenHandler(req: Request, res: Response) {
    try {
        const { refreshToken } = req.body;
        const result = await refreshAccessTokenService(refreshToken);
        res.status(200).json({
            status: "success",
            message: "Access token refreshed successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(401).json({ status: "error", message: error.message || "Invalid refresh token" });
    }
}