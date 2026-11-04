import type { UploadApiResponse } from "cloudinary";
import cloudinary from "../configs/cloudinary.config";
import { AppError } from "../errors";

interface UploadOptions {
  folder?: string;
  transformation?: object[];
}

/**
 * Upload an image buffer directly to Cloudinary.
 * @param buffer File buffer (from multer memoryStorage)
 * @param options Folder name, transformations, etc.
 * @returns UploadApiResponse with secure_url, public_id, etc.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { folder = "mini-project/avatars" } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: options.transformation,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new AppError(
              `Failed to upload image to Cloudinary: ${error?.message || "Unknown error"}`,
              500,
            ),
          );
        }
        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

