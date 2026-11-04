import type { Request, Response } from "express";
import {
  getUserProfileService,
  updateUserProfileService,
} from "../services/user.service";
import { sendSuccess } from "../utils/response";
import type { UpdateProfileInput } from "../validations/user.validation";

/**
 * Handler to get current authenticated user profile.
 */
export async function getMeHandler(req: Request, res: Response) {
  const user = await getUserProfileService(req.user!.id);
  sendSuccess(res, 200, "Successfully fetched user profile", { user });
}

/**
 * Handler to update current authenticated user profile (name, avatarUrl).
 */
export async function updateMeHandler(req: Request, res: Response) {
  const payload = req.body as UpdateProfileInput;
  const user = await updateUserProfileService(req.user!.id, payload);
  sendSuccess(res, 200, "Profile updated successfully", { user });
}
