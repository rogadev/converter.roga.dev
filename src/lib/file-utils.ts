import type { FileKind, ImageFormat } from './types';

// Constants for better maintainability
const MIME_TYPE_PREFIXES = {
  IMAGE: 'image/',
  VIDEO: 'video/'
} as const;

const SUPPORTED_VIDEO_TYPES = ['video/mp4'] as const;

export function detectFileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'video/mp4') return 'video';
  return 'unsupported';
}

export function getDefaultImageTarget(file: File): ImageFormat {
  const mimeType = file.type.toLowerCase();
  const currentFormat = mimeType.replace('image/', '') as ImageFormat;

  // Prefer modern formats, but avoid converting to the same format
  const preferredFormats: ImageFormat[] = ['webp', 'avif', 'png', 'jpeg'];

  return preferredFormats.find(format => format !== currentFormat) ?? 'webp';
}

const FORMAT_LABELS: Record<string, string> = {
  webp: 'WebP',
  jpeg: 'JPEG',
  png: 'PNG',
  avif: 'AVIF'
} as const;

export function formatImageLabel(format: string): string {
  return FORMAT_LABELS[format.toLowerCase()] ?? format.toUpperCase();
}

export function isValidImageFormat(format: string): format is ImageFormat {
  return ['png', 'jpeg', 'webp', 'avif'].includes(format);
}
