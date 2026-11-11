import { Router } from "express";
import {
  cancelCustomerTransactionHandler,
  createTransactionHandler,
  getCustomerTransactionsHandler,
  getTransactionDetailHandler,
  uploadPaymentProofHandler,
} from "../controllers/transaction.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createTransactionSchema,
  transactionIdParamSchema,
} from "../validations/transaction.validation";

const router = Router();

router.use(asyncHandler(requireAuth));

// Customer transactions
router.post(
  "/",
  requireRole("CUSTOMER"),
  validate({ body: createTransactionSchema }),
  asyncHandler(createTransactionHandler),
);

router.get("/me", requireRole("CUSTOMER"), asyncHandler(getCustomerTransactionsHandler));

router.get(
  "/:transactionId",
  validate({ params: transactionIdParamSchema }),
  asyncHandler(getTransactionDetailHandler),
);

router.post(
  "/:transactionId/payment-proof",
  requireRole("CUSTOMER"),
  validate({ params: transactionIdParamSchema }),
  uploadSingleImage,
  asyncHandler(uploadPaymentProofHandler),
);

router.post(
  "/:transactionId/cancel",
  requireRole("CUSTOMER"),
  validate({ params: transactionIdParamSchema }),
  asyncHandler(cancelCustomerTransactionHandler),
);

export default router;
