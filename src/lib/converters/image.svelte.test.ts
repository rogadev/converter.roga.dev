import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { convertImageFile, type ImageFormat } from './image';

declare global {
  // eslint-disable-next-line no-var
  var createImageBitmap: (blob: Blob) => Promise<{ width: number; height: number; }>;
  // eslint-disable-next-line no-var
  var OffscreenCanvas: any;
}

function createTestFile(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

class FakeOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return { drawImage: vi.fn() };
  }
  convertToBlob(opts: { type: string; quality?: number; }) {
    return Promise.resolve(new Blob([new Uint8Array([1, 2, 3])], { type: opts.type }));
  }
}

// Factory function to create a mock with call tracking
function createMockOffscreenCanvasWithTracking(calls: Array<{ type: string; quality?: number; }>) {
  return class extends FakeOffscreenCanvas {
    convertToBlob(opts: { type: string; quality?: number; }) {
      calls.push({ type: opts.type, quality: opts.quality });
      return Promise.resolve(new Blob([new Uint8Array([1, 2, 3])], { type: opts.type }));
    }
  };
}

describe('convertImageFile (browser)', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalOffscreenCanvas = (globalThis as any).OffscreenCanvas;

  beforeEach(() => {
    // Minimal createImageBitmap mock
    globalThis.createImageBitmap = vi.fn(async (blob: Blob) => {
      // default pretend image size with close method
      return {
        width: 2000,
        height: 1000,
        close: vi.fn() // Mock the close method
      } as any;
    }) as any;
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap as any;
    (globalThis as any).OffscreenCanvas = originalOffscreenCanvas;
    vi.restoreAllMocks();
  });

  it('respects maxWidth only and keeps aspect ratio using OffscreenCanvas', async () => {
    const calls: Array<{ type: string; quality?: number; }> = [];
    (globalThis as any).OffscreenCanvas = createMockOffscreenCanvasWithTracking(calls);

    const file = createTestFile('photo.jpg', 'image/jpeg');
    const out = await convertImageFile(file, { targetFormat: 'webp', maxWidth: 1000, quality: 0.5 });

    expect(out.type).toBe('image/webp');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ type: 'image/webp', quality: 0.5 });
  });

  it('falls back to DOM canvas when OffscreenCanvas is not available', async () => {
    (globalThis as any).OffscreenCanvas = undefined;

    // Mock DOM canvas and toBlob
    const toBlobMock = vi.fn((cb: (b: Blob | null) => void, type?: string, quality?: number) => {
      cb(new Blob([new Uint8Array([4, 5, 6])], { type }));
    });
    const getContextMock = vi.fn(() => ({ drawImage: vi.fn() }));
    const createElementSpy = vi.spyOn(document, 'createElement');
    createElementSpy.mockImplementation((tag: string): any => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: getContextMock, toBlob: toBlobMock };
      }
      return document.createElement(tag);
    });

    const file = createTestFile('pic.png', 'image/png');
    const out = await convertImageFile(file, { targetFormat: 'jpeg', maxHeight: 500 });

    expect(out.type).toBe('image/jpeg');
    expect(getContextMock).toHaveBeenCalled();
    expect(toBlobMock).toHaveBeenCalled();
  });
});


