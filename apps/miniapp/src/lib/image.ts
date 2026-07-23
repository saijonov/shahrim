/**
 * Client-side image compression for the report flow (PRD §16: "Image upload
 * compressed client-side before send"). Photos are taken outdoors on mobile
 * networks, so we downscale to a sane max dimension and re-encode as JPEG
 * before the multipart upload — smaller payload, faster + more reliable send.
 */

const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.8;

/** Compute a size that fits within `maxDim` on the longest edge, keeping ratio. */
function fitWithin(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Decode a File into something drawable, preferring the fast bitmap path. */
async function decode(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }
  // Fallback: decode via an <img> and an object URL.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Downscale + re-encode an image File as JPEG. Longest edge is clamped to
 * `maxDim` (default 1600px) and quality defaults to ~0.8. If anything about the
 * canvas pipeline is unavailable (or the input is not a decodable raster), the
 * original File is returned untouched so a report can never be blocked by
 * compression.
 */
export async function compressImage(
  file: File,
  maxDim: number = DEFAULT_MAX_DIM,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  try {
    const { source, width, height, cleanup } = await decode(file);
    try {
      const target = fitWithin(width, height, maxDim);
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(source, 0, 0, target.width, target.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
      );
      if (!blob) return file;

      const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      cleanup();
    }
  } catch {
    // Never let compression failure stop a report — send the original bytes.
    return file;
  }
}
