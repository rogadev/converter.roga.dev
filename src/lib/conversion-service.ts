import { convertImageFile, type ImageFormat } from './converters/image';
import { convertMp4ToGif, type Mp4ToGifOptions } from './converters/video';

export interface ImageConversionParams {
  targetFormat: ImageFormat;
  quality: number;
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
    });

    const filename = this.renameFile(file.name, params.targetFormat);
    return { blob, filename };
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
    const filename = this.renameFile(file.name, 'gif');
    return { blob, filename };
  }

  private static renameFile(original: string, newExt: string): string {
    const idx = original.lastIndexOf('.');
    const base = idx > 0 ? original.slice(0, idx) : original;
    return `${base}.${newExt}`;
  }
}
