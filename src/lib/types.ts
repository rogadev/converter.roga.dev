export type FileKind = 'image' | 'video' | 'unsupported' | null;

export interface ConversionState {
  selectedFile: File | null;
  fileKind: FileKind;
  errorMessage: string | null;
  working: boolean;
  outputUrl: string | null;
  outputSize: string | null;
}

export interface ImageSettings {
  target: ImageFormat;
  quality: number;
}

export interface VideoSettings {
  width: number | '';
  fps: number | '';
  start: number | '';
  duration: number | '';
  highQuality: boolean;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export const IMAGE_FORMATS: readonly ImageFormat[] = ['png', 'jpeg', 'webp', 'avif'] as const;
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'] as const;
export const SUPPORTED_VIDEO_TYPES = ['video/mp4'] as const;
