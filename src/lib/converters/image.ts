import type { ImageFormat, CropRect } from '../types';

export type { ImageFormat };

export interface ImageConvertOptions {
  targetFormat: ImageFormat;
  quality?: number; // 0..1
  maxWidth?: number;
  maxHeight?: number;
  cropRect?: CropRect;
}

interface Dimensions {
  width: number;
  height: number;
}

const MIME_TYPES: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon'
};

const DEFAULT_SVG_SIZE = 1024;

function getMimeType(format: ImageFormat): string {
  return MIME_TYPES[format];
}

/**
 * Calculates output dimensions respecting maxWidth/maxHeight constraints.
 * Maintains aspect ratio and never upscales beyond source dimensions.
 */
function calculateOutputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth?: number,
  maxHeight?: number
): Dimensions {
  // Guard against zero/invalid dimensions
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 1, height: 1 };
  }

  if (!maxWidth && !maxHeight) {
    return { width: sourceWidth, height: sourceHeight };
  }

  if (maxWidth && !maxHeight) {
    const scale = maxWidth / sourceWidth;
    return {
      width: Math.round(sourceWidth * scale) || 1,
      height: Math.round(sourceHeight * scale) || 1
    };
  }

  if (!maxWidth && maxHeight) {
    const scale = maxHeight / sourceHeight;
    return {
      width: Math.round(sourceWidth * scale) || 1,
      height: Math.round(sourceHeight * scale) || 1
    };
  }

  // Both constraints: fit within bounds without upscaling
  const scale = Math.min(maxWidth! / sourceWidth, maxHeight! / sourceHeight, 1);
  return {
    width: Math.round(sourceWidth * scale) || 1,
    height: Math.round(sourceHeight * scale) || 1
  };
}

/**
 * Renders to canvas and exports as blob, using OffscreenCanvas when available.
 */
async function renderToBlob(
  width: number,
  height: number,
  mimeType: string,
  quality: number | undefined,
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void
): Promise<Blob> {
  // Prefer OffscreenCanvas for better performance
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Failed to acquire OffscreenCanvas 2D context');
    draw(ctx);
    return canvas.convertToBlob({ type: mimeType, quality });
  }

  // Fallback to DOM canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire DOM canvas 2D context');
  draw(ctx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      mimeType,
      quality
    );
  });
}

/**
 * Wraps a PNG blob in ICO format header.
 * ICO files store dimensions as bytes (0 = 256px).
 */
async function wrapPngAsIco(width: number, height: number, pngBlob: Blob): Promise<Blob> {
  const pngData = new Uint8Array(await pngBlob.arrayBuffer());

  const ICO_HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const imageOffset = ICO_HEADER_SIZE + DIR_ENTRY_SIZE;

  const buffer = new ArrayBuffer(imageOffset + pngData.length);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // ICONDIR header
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: 1 = icon
  view.setUint16(4, 1, true); // image count

  // ICONDIRENTRY (ICO spec: 0 means 256)
  bytes[6] = width >= 256 ? 0 : width;
  bytes[7] = height >= 256 ? 0 : height;
  bytes[8] = 0; // color palette size
  bytes[9] = 0; // reserved
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, pngData.length, true);
  view.setUint32(18, imageOffset, true);

  bytes.set(pngData, imageOffset);

  return new Blob([bytes], { type: 'image/x-icon' });
}

/**
 * Extracts SVG viewBox dimensions when naturalWidth/Height aren't available.
 */
async function extractSvgDimensions(file: File): Promise<Dimensions | null> {
  try {
    const text = await file.text();
    const match = text.match(/viewBox\s*=\s*"[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/i);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  } catch {
    // Parsing failed; caller should use fallback
  }
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

async function convertSvg(
  file: File,
  options: ImageConvertOptions,
  outputMimeType: string
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // SVGs may lack intrinsic dimensions
    if (!width || !height) {
      const viewBoxDims = await extractSvgDimensions(file);
      if (viewBoxDims) {
        width = viewBoxDims.width;
        height = viewBoxDims.height;
      } else {
        width = DEFAULT_SVG_SIZE;
        height = DEFAULT_SVG_SIZE;
      }
    }

    const output = calculateOutputDimensions(width, height, options.maxWidth, options.maxHeight);

    return renderToBlob(output.width, output.height, outputMimeType, options.quality, (ctx) => {
      ctx.drawImage(img, 0, 0, output.width, output.height);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertRasterImage(
  file: File,
  options: ImageConvertOptions,
  outputMimeType: string
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const crop = options.cropRect;
    const sourceX = crop?.x ?? 0;
    const sourceY = crop?.y ?? 0;
    const sourceWidth = crop?.width ?? bitmap.width;
    const sourceHeight = crop?.height ?? bitmap.height;

    const output = calculateOutputDimensions(
      sourceWidth,
      sourceHeight,
      options.maxWidth,
      options.maxHeight
    );

    return await renderToBlob(output.width, output.height, outputMimeType, options.quality, (ctx) => {
      ctx.drawImage(
        bitmap,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, output.width, output.height
      );
    });
  } finally {
    bitmap.close();
  }
}

export async function convertImageFile(
  file: File,
  options: ImageConvertOptions
): Promise<Blob> {
  const isSvg = file.type === 'image/svg+xml';
  const isIco = options.targetFormat === 'ico';
  const outputMimeType = isIco ? 'image/png' : getMimeType(options.targetFormat);

  const rasterBlob = isSvg
    ? await convertSvg(file, options, outputMimeType)
    : await convertRasterImage(file, options, outputMimeType);

  if (!isIco) {
    return rasterBlob;
  }

  // ICO needs dimensions for header; re-decode to get them
  const bitmap = await createImageBitmap(rasterBlob);
  const { width, height } = bitmap;
  bitmap.close();

  return wrapPngAsIco(width, height, rasterBlob);
}
