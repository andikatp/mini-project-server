import { Router } from "express";
import authRoutes from "./auth.route.ts";
import userRoutes from "./user.route.ts";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;
