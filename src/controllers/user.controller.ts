import type { Request, Response } from "express";
import { getUserProfileService } from "../services/user.service";
import { sendSuccess } from "../utils/response";

/**
 * Handler to get current authenticated user profile.
 */
export async function getMeHandler(req: Request, res: Response) {
  const user = await getUserProfileService(req.user!.id);
  sendSuccess(res, 200, "Successfully fetched user profile", { user });
}
