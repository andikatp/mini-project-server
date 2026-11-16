import { Router } from "express";
import { processExpiredTransactionsHandler } from "../controllers/internal.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AuthenticationError } from "../errors";

const router = Router();

// Internal cron routes require pre-shared internal secret verification
router.use((req, _res, next) => {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET || "internal-cron-default-secret";
  const incomingSecret =
    req.headers["x-internal-secret"] ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (process.env.NODE_ENV !== "test" && (!incomingSecret || incomingSecret !== configuredSecret)) {
    throw new AuthenticationError("Unauthorized. Invalid or missing internal cron secret.");
  }

  next();
});

/**
 * @swagger
 * /internal/jobs/process-expired-transactions:
 *   post:
 *     summary: Trigger background expiration job for unpaid transactions (Requires internal secret)
 *     tags: [Internal / Cron]
 *     parameters:
 *       - in: header
 *         name: x-internal-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expired transactions processed
 *       401:
 *         description: Unauthorized (Invalid secret)
 */
router.post("/jobs/process-expired-transactions", asyncHandler(processExpiredTransactionsHandler));

export default router;

