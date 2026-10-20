import { Router } from "express";
import authRoutes from "./auth.route.ts";

const router = Router();

router.use("/auth", authRoutes);

export default router;