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
  const isSvg = file.type === 'image/svg+xml';
  const mimeType = getMimeType(options.targetFormat);

  if (isSvg) {
    // Rasterize SVG via HTMLImageElement for broader compatibility
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to load SVG image'));
        i.src = url;
      });

      let intrinsicWidth = img.naturalWidth || img.width || 0;
      let intrinsicHeight = img.naturalHeight || img.height || 0;

      // Fallback when SVG has no intrinsic dimensions
      if (intrinsicWidth === 0 || intrinsicHeight === 0) {
        try {
          const svgText = await file.text();
          const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/i);
          if (viewBoxMatch) {
            const vbWidth = parseFloat(viewBoxMatch[3]);
            const vbHeight = parseFloat(viewBoxMatch[4]);
            if (vbWidth > 0 && vbHeight > 0) {
              intrinsicWidth = vbWidth;
              intrinsicHeight = vbHeight;
            }
          }
        } catch {
          // ignore; will use default fallback below
        }
        if (intrinsicWidth === 0 || intrinsicHeight === 0) {
          intrinsicWidth = 1024;
          intrinsicHeight = 1024;
        }
      }

      const targetWidth = options.maxWidth ? Math.min(options.maxWidth, intrinsicWidth) : intrinsicWidth;
      const targetHeight = options.maxHeight ? Math.min(options.maxHeight, intrinsicHeight) : intrinsicHeight;

      const { width, height } = (() => {
        if (options.maxWidth && !options.maxHeight) {
          const scale = options.maxWidth / intrinsicWidth;
          return { width: Math.round(intrinsicWidth * scale), height: Math.round(intrinsicHeight * scale) };
        }
        if (!options.maxWidth && options.maxHeight) {
          const scale = options.maxHeight / intrinsicHeight;
          return { width: Math.round(intrinsicWidth * scale), height: Math.round(intrinsicHeight * scale) };
        }
        if (options.maxWidth && options.maxHeight) {
          const scale = Math.min(options.maxWidth / intrinsicWidth, options.maxHeight / intrinsicHeight);
          const s = Math.min(scale, 1);
          return { width: Math.round(intrinsicWidth * s), height: Math.round(intrinsicHeight * s) };
        }
        return { width: targetWidth, height: targetHeight };
      })();

      if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
        const oc = new (globalThis as any).OffscreenCanvas(width, height);
        const octx = oc.getContext('2d', { alpha: true });
        if (!octx) throw new Error('Failed to acquire 2D context');
        octx.drawImage(img, 0, 0, width, height);
        if (typeof (oc as any).convertToBlob === 'function') {
          return await (oc as any).convertToBlob({ type: mimeType, quality: options.quality });
        }
      }

      const domCanvas = document.createElement('canvas');
      domCanvas.width = width;
      domCanvas.height = height;
      const domCtx = domCanvas.getContext('2d');
      if (!domCtx) throw new Error('Failed to acquire DOM 2D context');
      domCtx.drawImage(img, 0, 0, width, height);
      const out = await new Promise<Blob>((resolve, reject) => {
        domCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob produced null'))), mimeType, options.quality);
      });
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Non-SVG flow: use ImageBitmap for efficiency
  const imageBitmap = await createImageBitmap(file);

  const targetWidth = options.maxWidth ? Math.min(options.maxWidth, imageBitmap.width) : imageBitmap.width;
  const targetHeight = options.maxHeight ? Math.min(options.maxHeight, imageBitmap.height) : imageBitmap.height;

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

  if (typeof (globalThis as any).OffscreenCanvas !== 'undefined') {
    const oc = new (globalThis as any).OffscreenCanvas(width, height);
    const octx = oc.getContext('2d', { alpha: true });
    if (!octx) throw new Error('Failed to acquire 2D context');
    octx.drawImage(imageBitmap, 0, 0, width, height);
    if (typeof (oc as any).convertToBlob === 'function') {
      const blob = await (oc as any).convertToBlob({ type: mimeType, quality: options.quality });
      imageBitmap.close();
      return blob;
    }
  }

  const domCanvas = document.createElement('canvas');
  domCanvas.width = width;
  domCanvas.height = height;
  const domCtx = domCanvas.getContext('2d');
  if (!domCtx) throw new Error('Failed to acquire DOM 2D context');
  domCtx.drawImage(imageBitmap, 0, 0, width, height);
  const out = await new Promise<Blob>((resolve, reject) => {
    domCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob produced null'))), mimeType, options.quality);
  });
  imageBitmap.close();
  return out;
}


