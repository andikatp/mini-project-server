import { Router } from "express";
import { uploadImageHandler } from "../controllers/upload.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadSingleImage } from "../middlewares/upload.middleware";

const router = Router();

/**
 * @swagger
 * /upload/image:
 *   post:
 *     summary: Upload an image to Cloudinary
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Target folder in Cloudinary (optional)
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid file format or missing file
 *       401:
 *         description: Not authenticated
 */
router.post(
  "/image",
  requireAuth,
  uploadSingleImage,
  asyncHandler(uploadImageHandler),
);

export default router;

