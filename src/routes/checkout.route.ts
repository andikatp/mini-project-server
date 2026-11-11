import { Router } from "express";
import { previewCheckoutHandler } from "../controllers/transaction.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { checkoutPreviewSchema } from "../validations/transaction.validation";

const router = Router();

router.use(asyncHandler(requireAuth));
router.use(requireRole("CUSTOMER"));

router.post("/preview", validate({ body: checkoutPreviewSchema }), asyncHandler(previewCheckoutHandler));

export default router;

