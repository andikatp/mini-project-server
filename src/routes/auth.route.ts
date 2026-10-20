import { Router } from "express";
import { loginHandler, refreshAccessTokenHandler, registerHandler } from "../controllers/auth.controller";

const router = Router();

// POST /api/auth/register
router.post("/register", registerHandler);

// POST /api/auth/login
router.post("/login", loginHandler);

// POST /api/auth/refresh-token
router.post("/refresh-token", refreshAccessTokenHandler);

export default router;