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
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);

  const ffmpeg = new FFmpeg();
  return { ffmpeg, fetchFile };
}

export async function convertMp4ToGif(file: File, options: Mp4ToGifOptions = {}): Promise<Blob> {
  const { ffmpeg, fetchFile } = await loadFfmpeg();

  try {
    await ffmpeg.load();

    const inputName = "input.mp4";
    const outputName = "output.gif";
    const paletteName = "palette.png";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const args: string[] = ["-i", inputName];
    if (options.start != null) {
      args.unshift("-ss", String(options.start));
    }
    if (options.duration != null) {
      args.push("-t", String(options.duration));
    }
    const fps = options.fps ?? 12;
    const width = options.width;

    const scaleFilter =
      width != null ? `scale=${width}:-1:flags=lanczos` : "scale=iw:ih:flags=lanczos";
    const fpsFilter = `fps=${fps}`;
    const filter = `${fpsFilter},${scaleFilter}`;

    if (options.highQuality) {
      // First pass: generate palette, honoring seek/duration if provided
      await ffmpeg.exec([
        ...args,
        "-vf",
        `${filter},palettegen=stats_mode=full`,
        "-y",
        paletteName,
      ]);
      // Second pass: use palette for higher quality, also honoring seek/duration
      await ffmpeg.exec([
        ...args,
        "-i",
        paletteName,
        "-lavfi",
        `${filter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
        "-y",
        outputName,
      ]);
    } else {
      await ffmpeg.exec([...args, "-vf", filter, "-y", outputName]);
    }

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

    if (!(data instanceof Uint8Array)) {
      throw new Error("Expected binary data from FFmpeg");
    }
    const bytes = new ArrayBuffer(data.byteLength);
    new Uint8Array(bytes).set(data);
    return new Blob([bytes], { type: "image/gif" });
  } catch (error) {
    throw new Error(
      `Failed to convert MP4 to GIF: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error },
    );
  } finally {
    ffmpeg.terminate();
  }
}
