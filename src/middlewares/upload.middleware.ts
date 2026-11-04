import multer from "multer";
import { ValidationError } from "../errors";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError(
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        ),
      );
    }
  },
}).single("image");
