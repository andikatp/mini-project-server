import { describe, expect, it, spyOn } from "bun:test";
import sharp from "sharp";
import { uploadImageHandler } from "../../src/controllers/upload.controller";
import { ValidationError } from "../../src/errors";
import * as cloudinaryService from "../../src/services/cloudinary.service";
import { compressImage } from "../../src/utils/image.compress";

describe("Upload Image & Compression", () => {
  describe("compressImage utility", () => {
    it("should compress and convert a PNG buffer to WebP format", async () => {
      const samplePng = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const compressed = await compressImage(samplePng, {
        maxWidth: 50,
        maxHeight: 50,
        quality: 80,
      });

      expect(compressed).toBeInstanceOf(Buffer);

      const metadata = await sharp(compressed).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeLessThanOrEqual(50);
      expect(metadata.height).toBeLessThanOrEqual(50);
    });
  });

  describe("uploadImageHandler", () => {
    it("should throw ValidationError if no file is provided in request", async () => {
      const req: any = { file: undefined };
      const res: any = {};

      await expect(uploadImageHandler(req, res)).rejects.toThrow(ValidationError);
    });

    it("should compress image and call Cloudinary service, returning 201 with secure URL", async () => {
      const dummyBuffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 128, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const req: any = {
        file: {
          buffer: dummyBuffer,
          mimetype: "image/jpeg",
          originalname: "avatar.jpg",
        },
        body: {
          folder: "mini-project/avatars",
        },
      };

      const res: any = {
        statusCode: 0,
        jsonPayload: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          this.jsonPayload = data;
          return this;
        },
      };

      const mockResult: any = {
        secure_url: "https://res.cloudinary.com/demo/image/upload/sample.webp",
        public_id: "mini-project/avatars/sample",
        format: "webp",
        width: 50,
        height: 50,
      };

      const spyUpload = spyOn(
        cloudinaryService,
        "uploadImageToCloudinary",
      ).mockResolvedValue(mockResult);

      try {
        await uploadImageHandler(req, res);

        expect(res.statusCode).toBe(201);
        expect(res.jsonPayload.status).toBe("success");
        expect(res.jsonPayload.data.url).toBe(mockResult.secure_url);
        expect(res.jsonPayload.data.publicId).toBe(mockResult.public_id);
        expect(spyUpload).toHaveBeenCalledTimes(1);
      } finally {
        spyUpload.mockRestore();
      }
    });
  });
});
