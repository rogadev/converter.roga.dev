export interface Mp4ToGifOptions {
  width?: number;
  fps?: number;
  start?: number; // seconds
  duration?: number; // seconds
  highQuality?: boolean; // use palettegen/paletteuse
}

// Lazy dynamic import to keep initial bundle small
async function loadFfmpeg() {
  const [{ FFmpeg }, { fetchFile }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util')
  ]);

  const ffmpeg = new FFmpeg();
  return { ffmpeg, fetchFile };
}

export async function convertMp4ToGif(file: File, options: Mp4ToGifOptions = {}): Promise<Blob> {
  try {
    console.log('Starting MP4 to GIF conversion...');
    const { ffmpeg, fetchFile } = await loadFfmpeg();
    console.log('FFmpeg loaded, starting core load...');

    await ffmpeg.load();
    console.log('FFmpeg core loaded successfully');

    const inputName = 'input.mp4';
    const outputName = 'output.gif';
    const paletteName = 'palette.png';

    await ffmpeg.writeFile(inputName, await fetchFile(file));
    console.log('Input file written to FFmpeg filesystem');

    const args: string[] = ['-i', inputName];
    if (options.start != null) {
      args.unshift('-ss', String(options.start));
    }
    if (options.duration != null) {
      args.push('-t', String(options.duration));
    }
    const fps = options.fps ?? 12;
    const width = options.width;

    const scaleFilter = width ? `scale=${width}:-1:flags=lanczos` : 'scale=iw:ih:flags=lanczos';
    const fpsFilter = `fps=${fps}`;
    const filter = `${fpsFilter},${scaleFilter}`;

    if (options.highQuality) {
      // palette generation improves quality
      console.log('Starting high-quality conversion with palette generation...');
      await ffmpeg.exec([
        '-i',
        inputName,
        '-vf',
        `${filter},palettegen=stats_mode=full`,
        '-y',
        paletteName
      ]);
      await ffmpeg.exec([
        '-i',
        inputName,
        '-i',
        paletteName,
        '-lavfi',
        `${filter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
        '-y',
        outputName
      ]);
    } else {
      console.log('Starting standard quality conversion...');
      await ffmpeg.exec(['-i', inputName, '-vf', filter, '-y', outputName]);
    }

    console.log('Conversion completed, reading output file...');
    const data = await ffmpeg.readFile(outputName);

    // Clean up files
    await ffmpeg.deleteFile(inputName);
    if (options.highQuality) {
      try {
        await ffmpeg.deleteFile(paletteName);
      } catch {
        // Ignore if file doesn't exist
      }
    }
    await ffmpeg.deleteFile(outputName);

    console.log('Conversion successful, returning blob...');
    // Convert FileData to BlobPart - data should be Uint8Array for binary files
    // @ts-expect-error FileData type is compatible with Uint8Array at runtime
    return new Blob([data], { type: 'image/gif' });
  } catch (error) {
    console.error('Error during MP4 to GIF conversion:', error);
    throw new Error(`Failed to convert MP4 to GIF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


