import type { FileKind, ImageFormat } from './types';

export function detectFileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'video/mp4') return 'video';
  return 'unsupported';
}

const MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
};

export function getDefaultImageTarget(file: File): ImageFormat {
  const currentFormat = MIME_TO_FORMAT[file.type.toLowerCase()];

  // Prefer modern formats, but avoid converting to the same format
  const preferredFormats: ImageFormat[] = ['webp', 'avif', 'png', 'jpeg', 'ico'];

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
  return ['png', 'jpeg', 'webp', 'avif', 'ico'].includes(format);
}
