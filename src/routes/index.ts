import { Router } from "express";
import authRoutes from "./auth.route.ts";
import checkoutRoutes from "./checkout.route.ts";
import eventRoutes from "./event.route.ts";
import internalRoutes from "./internal.route.ts";
import organizerRoutes from "./organizer.route.ts";
import reviewRoutes from "./review.route.ts";
import rewardRoutes from "./reward.route.ts";
import transactionRoutes from "./transaction.route.ts";
import uploadRoutes from "./upload.route.ts";
import userRoutes from "./user.route.ts";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/rewards", rewardRoutes);
router.use("/organizer", organizerRoutes);
router.use("/events", eventRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/transactions", transactionRoutes);
router.use("/reviews", reviewRoutes);
router.use("/internal", internalRoutes);

// Public organizers routes (e.g. /organizers/:organizerId/reviews)
router.use("/", reviewRoutes);

export default router;
