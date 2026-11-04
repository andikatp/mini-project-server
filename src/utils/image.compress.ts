import sharp from "sharp";

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compress and convert an image buffer to optimized WebP format.
 *
 * @param buffer Raw image buffer
 * @param options Resize & quality options (default: max 1080px, quality 80)
 * @returns Compressed buffer in WebP format
 */
export async function compressImage(
  buffer: Buffer,
  options: CompressOptions = {},
): Promise<Buffer> {
  const { maxWidth = 1080, maxHeight = 1080, quality = 80 } = options;

  return sharp(buffer)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

