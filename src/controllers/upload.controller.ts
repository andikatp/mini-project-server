import type { Request, Response } from "express";
import { ValidationError } from "../errors";
import { uploadImageToCloudinary } from "../services/cloudinary.service";
import { compressImage } from "../utils/image.compress";
import { sendSuccess } from "../utils/response";

/**
 * Handle image upload and return Cloudinary secure URL.
 */
export async function uploadImageHandler(req: Request, res: Response) {
  if (!req.file) {
    throw new ValidationError("No image file provided. Please upload a file with field 'image'.");
  }

  const rawFolder = (req.body?.folder as string || "").trim();
  const folder = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/.test(rawFolder)
    ? rawFolder
    : "mini-project/uploads";

  // Compress and convert to optimized WebP before uploading to Cloudinary
  const compressedBuffer = await compressImage(req.file.buffer, {
    maxWidth: 1080,
    maxHeight: 1080,
    quality: 80,
  });

  const result = await uploadImageToCloudinary(compressedBuffer, {
    folder,
  });

  return sendSuccess(res, 201, "Image uploaded successfully", {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
  });
}

