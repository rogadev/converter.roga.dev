export type FileKind = 'image' | 'video' | 'unsupported' | null;

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoSettings {
  width: number | '';
  fps: number | '';
  start: number | '';
  duration: number | '';
  highQuality: boolean;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'ico';

export const IMAGE_FORMATS: readonly ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'ico'] as const;
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/svg+xml'
] as const;
export const SUPPORTED_VIDEO_TYPES = ['video/mp4'] as const;
