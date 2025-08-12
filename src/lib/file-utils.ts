import type { FileKind, ImageFormat } from './types';

export function detectFileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'video/mp4') return 'video';
  return 'unsupported';
}

export function getDefaultImageTarget(file: File): ImageFormat {
  const current = file.type.replace('image/', '') as ImageFormat;
  const candidates: ImageFormat[] = ['webp', 'avif', 'jpeg', 'png'];
  return candidates.find((c) => c !== current) ?? 'webp';
}

export function formatImageLabel(format: string): string {
  return format === 'webp' ? 'WebP' : format.toUpperCase();
}

export function isValidImageFormat(format: string): format is ImageFormat {
  return ['png', 'jpeg', 'webp', 'avif'].includes(format);
}
