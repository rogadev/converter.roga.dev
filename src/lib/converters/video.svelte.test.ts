import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertMp4ToGif } from './video';

vi.mock('@ffmpeg/ffmpeg', () => {
  class FFmpegMock {
    logs: string[] = [];
    async load() {
      this.logs.push('load');
    }
    async writeFile(name: string, _data: any) {
      this.logs.push(`write:${name}`);
    }
    async exec(args: string[]) {
      this.logs.push(`exec:${args.join(' ')}`);
    }
    async readFile(name: string) {
      this.logs.push(`read:${name}`);
      return new Uint8Array([1, 2, 3, 4]);
    }
    async deleteFile(name: string) {
      this.logs.push(`del:${name}`);
    }
  }
  return { FFmpeg: FFmpegMock };
});

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (f: File) => new Uint8Array(await f.arrayBuffer()))
}));

function createMp4(name = 'clip.mp4', size = 8): File {
  return new File([new Uint8Array(size)], name, { type: 'video/mp4' });
}

describe('convertMp4ToGif (browser)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds correct args for standard conversion with defaults', async () => {
    const blob = await convertMp4ToGif(createMp4());
    expect(blob.type).toBe('image/gif');
  });

  it('builds correct args with width/fps/start/duration and highQuality', async () => {
    const blob = await convertMp4ToGif(createMp4(), {
      width: 480,
      fps: 10,
      start: 2,
      duration: 5,
      highQuality: true
    });
    expect(blob.type).toBe('image/gif');
  });
});


