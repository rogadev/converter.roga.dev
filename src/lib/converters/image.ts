export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export interface ImageConvertOptions {
  targetFormat: ImageFormat;
  quality?: number; // 0..1
  maxWidth?: number;
  maxHeight?: number;
}

function getMimeType(format: ImageFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  return `image/${format}`;
}

export async function convertImageFile(
  file: File,
  options: ImageConvertOptions
): Promise<Blob> {
  // Create ImageBitmap directly from File for better memory efficiency
  const imageBitmap = await createImageBitmap(file);

  const targetWidth = options.maxWidth ? Math.min(options.maxWidth, imageBitmap.width) : imageBitmap.width;
  const targetHeight = options.maxHeight ? Math.min(options.maxHeight, imageBitmap.height) : imageBitmap.height;

  // Maintain aspect ratio if only one dimension provided
  const { width, height } = (() => {
    if (options.maxWidth && !options.maxHeight) {
      const scale = options.maxWidth / imageBitmap.width;
      return { width: Math.round(imageBitmap.width * scale), height: Math.round(imageBitmap.height * scale) };
    }
    if (!options.maxWidth && options.maxHeight) {
      const scale = options.maxHeight / imageBitmap.height;
      return { width: Math.round(imageBitmap.width * scale), height: Math.round(imageBitmap.height * scale) };
    }
    if (options.maxWidth && options.maxHeight) {
      const scale = Math.min(options.maxWidth / imageBitmap.width, options.maxHeight / imageBitmap.height);
      const s = Math.min(scale, 1);
      return { width: Math.round(imageBitmap.width * s), height: Math.round(imageBitmap.height * s) };
    }
    return { width: targetWidth, height: targetHeight };
  })();

  const mimeType = getMimeType(options.targetFormat);
  // Prefer OffscreenCanvas when available and supports convertToBlob
  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    const oc = new (globalThis as any).OffscreenCanvas(width, height);
    const octx = oc.getContext('2d', { alpha: true });
    if (!octx) throw new Error('Failed to acquire 2D context');
    octx.drawImage(imageBitmap, 0, 0, width, height);
    if (typeof (oc as any).convertToBlob === 'function') {
      return await (oc as any).convertToBlob({ type: mimeType, quality: options.quality });
    }
  }

  // Fallback to DOM canvas
  const domCanvas = document.createElement('canvas');
  domCanvas.width = width;
  domCanvas.height = height;
  const domCtx = domCanvas.getContext('2d');
  if (!domCtx) throw new Error('Failed to acquire DOM 2D context');
  domCtx.drawImage(imageBitmap, 0, 0, width, height);
  const out = await new Promise<Blob>((resolve, reject) => {
    domCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob produced null'))), mimeType, options.quality);
  });

  // Clean up ImageBitmap to free memory
  imageBitmap.close();

  return out;
}


