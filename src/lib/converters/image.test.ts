import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertImageFile, type ImageFormat, type ImageConvertOptions } from './image';
import { MockFileFactory, TestFiles } from '../__tests__/helpers/mock-file-factory';

// Mock global APIs that aren't available in Node.js
const mockCreateImageBitmap = vi.fn();
const mockOffscreenCanvas = vi.fn();
const mockDocument = {
  createElement: vi.fn()
};

// Mock ImageBitmap
class MockImageBitmap {
  width: number;
  height: number;

  constructor(width = 100, height = 100) {
    this.width = width;
    this.height = height;
  }

  close() {
    // Mock cleanup
  }
}

// Mock Canvas and Context
class MockCanvas {
  width = 0;
  height = 0;
  private context: MockCanvasContext | null = null;

  getContext(type: string) {
    if (type === '2d') {
      this.context = new MockCanvasContext();
      return this.context;
    }
    return null;
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number) {
    // Simulate successful blob creation
    setTimeout(() => {
      const blob = new Blob(['mock image data'], { type: type || 'image/png' });
      callback(blob);
    }, 0);
  }
}

class MockCanvasContext {
  drawImage() {
    // Mock drawing operation
  }
}

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width = 0;
  height = 0;
  private context: MockCanvasContext | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(type: string) {
    if (type === '2d') {
      this.context = new MockCanvasContext();
      return this.context;
    }
    return null;
  }

  async convertToBlob(options?: { type?: string; quality?: number; }) {
    return new Blob(['mock offscreen image data'], { type: options?.type || 'image/png' });
  }
}

describe('Image Converter', () => {
  beforeEach(() => {
    // Setup global mocks
    global.createImageBitmap = mockCreateImageBitmap;
    global.document = mockDocument as any;
    (global as any).OffscreenCanvas = MockOffscreenCanvas;

    // Default mock implementations
    mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(800, 600));
    mockDocument.createElement.mockReturnValue(new MockCanvas());

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertImageFile', () => {
    it('should convert image to PNG format', async () => {
      // Arrange
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        quality: 0.9
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      expect(mockCreateImageBitmap).toHaveBeenCalledWith(testFile);
    });

    it('should convert image to JPEG format', async () => {
      // Arrange
      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'jpeg',
        quality: 0.8
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
    });

    it('should convert image to WebP format', async () => {
      // Arrange
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'webp',
        quality: 0.85
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
    });

    it('should convert image to AVIF format', async () => {
      // Arrange
      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'avif',
        quality: 0.7
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/avif');
    });

    it('should handle quality parameter correctly', async () => {
      // Arrange
      const testFile = TestFiles.jpegImage();
      const highQualityOptions: ImageConvertOptions = {
        targetFormat: 'jpeg',
        quality: 1.0
      };
      const lowQualityOptions: ImageConvertOptions = {
        targetFormat: 'jpeg',
        quality: 0.1
      };

      // Act
      const highQualityResult = await convertImageFile(testFile, highQualityOptions);
      const lowQualityResult = await convertImageFile(testFile, lowQualityOptions);

      // Assert
      expect(highQualityResult).toBeInstanceOf(Blob);
      expect(lowQualityResult).toBeInstanceOf(Blob);
      expect(highQualityResult.type).toBe('image/jpeg');
      expect(lowQualityResult.type).toBe('image/jpeg');
    });

    it('should handle maxWidth constraint', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(1000, 800));
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        maxWidth: 500
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
      // The function should have processed the image with the width constraint
      expect(mockCreateImageBitmap).toHaveBeenCalledWith(testFile);
    });

    it('should handle maxHeight constraint', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(800, 1000));
      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'webp',
        maxHeight: 400
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
    });

    it('should handle both maxWidth and maxHeight constraints', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(1200, 800));
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        maxWidth: 600,
        maxHeight: 400
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/png');
    });

    it('should maintain aspect ratio with maxWidth only', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(800, 600));
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        maxWidth: 400
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // The aspect ratio should be maintained (800:600 = 4:3)
    });

    it('should maintain aspect ratio with maxHeight only', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(800, 600));
      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'webp',
        maxHeight: 300
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
    });

    it('should not upscale images when constraints are larger', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(400, 300));
      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        maxWidth: 800,
        maxHeight: 600
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Should maintain original size when constraints are larger
    });

    it('should use OffscreenCanvas when available', async () => {
      // Arrange
      const mockConvertToBlob = vi.fn().mockResolvedValue(
        new Blob(['offscreen data'], { type: 'image/png' })
      );

      class MockOffscreenCanvasWithConvertToBlob extends MockOffscreenCanvas {
        convertToBlob = mockConvertToBlob;
      }

      (global as any).OffscreenCanvas = MockOffscreenCanvasWithConvertToBlob;

      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png',
        quality: 0.9
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockConvertToBlob).toHaveBeenCalledWith({
        type: 'image/png',
        quality: 0.9
      });
    });

    it('should fallback to DOM canvas when OffscreenCanvas is not available', async () => {
      // Arrange
      delete (global as any).OffscreenCanvas;

      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'jpeg',
        quality: 0.8
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockDocument.createElement).toHaveBeenCalledWith('canvas');
    });

    it('should fallback to DOM canvas when OffscreenCanvas lacks convertToBlob', async () => {
      // Arrange: provide an OffscreenCanvas implementation WITHOUT convertToBlob
      class MockOffscreenCanvasNoConvert {
        width = 0;
        height = 0;
        private context: MockCanvasContext | null = null;
        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
        }
        getContext(type: string) {
          if (type === '2d') {
            this.context = new MockCanvasContext();
            return this.context;
          }
          return null;
        }
        // Note: intentionally no convertToBlob here
      }
      (global as any).OffscreenCanvas = MockOffscreenCanvasNoConvert as any;

      const testFile = TestFiles.webpImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockDocument.createElement).toHaveBeenCalledWith('canvas');
    });

    it('should clean up ImageBitmap after conversion', async () => {
      // Arrange
      const mockImageBitmap = new MockImageBitmap();
      const closeSpy = vi.spyOn(mockImageBitmap, 'close');
      mockCreateImageBitmap.mockResolvedValue(mockImageBitmap);

      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act
      await convertImageFile(testFile, options);

      // Assert
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle createImageBitmap failure', async () => {
      // Arrange
      const error = new Error('Failed to create ImageBitmap');
      mockCreateImageBitmap.mockRejectedValue(error);

      const testFile = TestFiles.corruptedImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act & Assert
      await expect(convertImageFile(testFile, options))
        .rejects.toThrow('Failed to create ImageBitmap');
    });

    it('should handle OffscreenCanvas context creation failure', async () => {
      // Arrange
      class MockOffscreenCanvasNoContext extends MockOffscreenCanvas {
        getContext() {
          return null; // Simulate context creation failure
        }
      }
      (global as any).OffscreenCanvas = MockOffscreenCanvasNoContext;

      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act & Assert
      await expect(convertImageFile(testFile, options))
        .rejects.toThrow('Failed to acquire 2D context');
    });

    it('should handle DOM canvas context creation failure', async () => {
      // Arrange
      delete (global as any).OffscreenCanvas;

      class MockCanvasNoContext extends MockCanvas {
        getContext() {
          return null; // Simulate context creation failure
        }
      }
      mockDocument.createElement.mockReturnValue(new MockCanvasNoContext());

      const testFile = TestFiles.pngImage();
      const options: ImageConvertOptions = {
        targetFormat: 'jpeg'
      };

      // Act & Assert
      await expect(convertImageFile(testFile, options))
        .rejects.toThrow('Failed to acquire DOM 2D context');
    });

    it('should handle toBlob returning null', async () => {
      // Arrange
      delete (global as any).OffscreenCanvas;

      class MockCanvasNullBlob extends MockCanvas {
        toBlob(callback: (blob: Blob | null) => void) {
          setTimeout(() => callback(null), 0);
        }
      }
      mockDocument.createElement.mockReturnValue(new MockCanvasNullBlob());

      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act & Assert
      await expect(convertImageFile(testFile, options))
        .rejects.toThrow('toBlob produced null');
    });

    it('should handle edge case with zero dimensions', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(0, 0));

      const testFile = TestFiles.jpegImage();
      const options: ImageConvertOptions = {
        targetFormat: 'png'
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle very large images', async () => {
      // Arrange
      mockCreateImageBitmap.mockResolvedValue(new MockImageBitmap(5000, 4000));

      const testFile = MockFileFactory.createLargeFile('huge.jpg', 'image/jpeg', 50);
      const options: ImageConvertOptions = {
        targetFormat: 'webp',
        maxWidth: 1920,
        maxHeight: 1080
      };

      // Act
      const result = await convertImageFile(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
    });

    it('should handle different quality values correctly', async () => {
      // Arrange
      const testFile = TestFiles.jpegImage();
      const qualityValues = [0, 0.25, 0.5, 0.75, 1.0];

      // Act & Assert
      for (const quality of qualityValues) {
        const options: ImageConvertOptions = {
          targetFormat: 'jpeg',
          quality
        };

        const result = await convertImageFile(testFile, options);
        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('image/jpeg');
      }
    });

    it('should handle all supported formats', async () => {
      // Arrange
      const testFile = TestFiles.jpegImage();
      const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif'];

      // Act & Assert
      for (const format of formats) {
        const options: ImageConvertOptions = {
          targetFormat: format
        };

        const result = await convertImageFile(testFile, options);
        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe(`image/${format === 'jpeg' ? 'jpeg' : format}`);
      }
    });
  });
});
