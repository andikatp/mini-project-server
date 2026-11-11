import { Router } from "express";
import { processExpiredTransactionsHandler } from "../controllers/internal.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.post("/jobs/process-expired-transactions", asyncHandler(processExpiredTransactionsHandler));

export default router;
