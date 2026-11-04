import type { Request, Response } from "express";
import {
  getUserCouponsService,
  getUserPointsService,
  validateSystemCouponService,
} from "../services/reward.service";
import { sendSuccess } from "../utils/response";

export async function getMyPointsHandler(req: Request, res: Response) {
  const result = await getUserPointsService(req.user!.id);
  sendSuccess(res, 200, "User points fetched successfully", result);
}

export async function getMyCouponsHandler(req: Request, res: Response) {
  const coupons = await getUserCouponsService(req.user!.id);
  sendSuccess(res, 200, "User coupons fetched successfully", { coupons });
}

export async function validateCouponHandler(req: Request, res: Response) {
  const code = (req.params.code || req.query.code) as string;
  const coupon = await validateSystemCouponService(req.user!.id, code);
  sendSuccess(res, 200, "Coupon is valid", { coupon });
}

