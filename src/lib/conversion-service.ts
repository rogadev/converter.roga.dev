import { convertImageFile, type ImageFormat } from './converters/image';
import { convertMp4ToGif, type Mp4ToGifOptions } from './converters/video';
import { renameFile } from './converters/web';
import type { CropRect } from './types';

export interface ImageConversionParams {
  targetFormat: ImageFormat;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  cropRect?: CropRect;
}

export interface VideoConversionParams {
  width: number | '';
  fps: number | '';
  start: number | '';
  duration: number | '';
  highQuality: boolean;
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

export class ConversionService {
  static async convertImage(
    file: File,
    params: ImageConversionParams
  ): Promise<ConversionResult> {
    const blob = await convertImageFile(file, {
      targetFormat: params.targetFormat,
      quality: params.quality,
      maxWidth: params.maxWidth,
      maxHeight: params.maxHeight,
      cropRect: params.cropRect,
    });

    return { blob, filename: renameFile(file.name, params.targetFormat) };
  }

  static async convertVideo(
    file: File,
    params: VideoConversionParams
  ): Promise<ConversionResult> {
    const opts: Mp4ToGifOptions = {
      width: params.width === '' ? undefined : Number(params.width),
      fps: params.fps === '' ? undefined : Number(params.fps),
      start: params.start === '' ? undefined : Number(params.start),
      duration: params.duration === '' ? undefined : Number(params.duration),
      highQuality: params.highQuality,
    };

    const blob = await convertMp4ToGif(file, opts);
    return { blob, filename: renameFile(file.name, 'gif') };
  }
}
