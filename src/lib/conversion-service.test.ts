import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversionService, type ImageConversionParams, type VideoConversionParams } from './conversion-service';
import { MockFileFactory, TestFiles } from './__tests__/helpers/mock-file-factory';

// Mock the converter modules
vi.mock('./converters/image', () => ({
  convertImageFile: vi.fn()
}));

vi.mock('./converters/video', () => ({
  convertMp4ToGif: vi.fn()
}));

describe('ConversionService', () => {
  // Test data constants
  const TEST_SCENARIOS = {
    image: {
      formats: ['png', 'jpeg', 'webp', 'avif'] as const,
      qualityRange: { min: 0, max: 1, default: 0.9 }
    },
    video: {
      formats: ['gif'] as const,
      defaultOptions: { width: 480, fps: 12, highQuality: true }
    }
  } as const;

  // Test helpers to reduce duplication
  const createMockBlob = (content: string, type: string) => new Blob([content], { type });

  const setupImageMock = async (mockBlob: Blob) => {
    const { convertImageFile } = await import('./converters/image');
    vi.mocked(convertImageFile).mockResolvedValue(mockBlob);
    return convertImageFile;
  };

  const setupVideoMock = async (mockBlob: Blob) => {
    const { convertMp4ToGif } = await import('./converters/video');
    vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);
    return convertMp4ToGif;
  };

  const setupImageError = async (error: Error) => {
    const { convertImageFile } = await import('./converters/image');
    vi.mocked(convertImageFile).mockRejectedValue(error);
    return convertImageFile;
  };

  const setupVideoError = async (error: Error) => {
    const { convertMp4ToGif } = await import('./converters/video');
    vi.mocked(convertMp4ToGif).mockRejectedValue(error);
    return convertMp4ToGif;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertImage', () => {
    it('should convert image with correct parameters', async () => {
      // Arrange
      const mockBlob = createMockBlob('converted image', 'image/png');
      const convertImageFile = await setupImageMock(mockBlob);
      const testFile = TestFiles.jpegImage();
      const params: ImageConversionParams = {
        targetFormat: 'png',
        quality: 0.8
      };

      // Act
      const result = await ConversionService.convertImage(testFile, params);

      // Assert
      expect(convertImageFile).toHaveBeenCalledWith(testFile, params);
      expect(result.blob).toBe(mockBlob);
      expect(result.filename).toBe('test.png');
    });

    it.each([
      { format: 'webp', inputFile: () => TestFiles.pngImage(), expectedFilename: 'test.webp' },
      { format: 'avif', inputFile: () => TestFiles.jpegImage(), expectedFilename: 'test.avif' },
      { format: 'png', inputFile: () => TestFiles.webpImage(), expectedFilename: 'test.png' },
      { format: 'jpeg', inputFile: () => TestFiles.avifImage(), expectedFilename: 'test.jpeg' }
    ] as const)('should convert to $format format correctly', async ({ format, inputFile, expectedFilename }) => {
      // Arrange
      const mockBlob = createMockBlob('converted image', `image/${format}`);
      const convertImageFile = await setupImageMock(mockBlob);
      const testFile = inputFile();
      const params: ImageConversionParams = {
        targetFormat: format,
        quality: 0.9
      };

      // Act
      const result = await ConversionService.convertImage(testFile, params);

      // Assert
      expect(result.filename).toBe(expectedFilename);
      expect(convertImageFile).toHaveBeenCalledWith(testFile, params);
    });

    it('should preserve filename without extension', async () => {
      // Arrange
      const mockBlob = new Blob(['converted image'], { type: 'image/avif' });
      const { convertImageFile } = await import('./converters/image');
      vi.mocked(convertImageFile).mockResolvedValue(mockBlob);

      const testFile = MockFileFactory.createFileWithoutExtension('noextension', 'image/jpeg');
      const params: ImageConversionParams = {
        targetFormat: 'avif',
        quality: 0.7
      };

      // Act
      const result = await ConversionService.convertImage(testFile, params);

      // Assert
      expect(result.filename).toBe('noextension.avif');
    });

    it('should handle conversion errors', async () => {
      // Arrange
      const conversionError = new Error('Image conversion failed');
      await setupImageError(conversionError);
      const testFile = TestFiles.corruptedImage();
      const params: ImageConversionParams = {
        targetFormat: 'png',
        quality: 0.8
      };

      // Act & Assert
      await expect(ConversionService.convertImage(testFile, params))
        .rejects.toThrow('Image conversion failed');
    });

    it('should handle edge case quality values', async () => {
      // Arrange
      const mockBlob = new Blob(['converted image'], { type: 'image/jpeg' });
      const { convertImageFile } = await import('./converters/image');
      vi.mocked(convertImageFile).mockResolvedValue(mockBlob);

      const testFile = TestFiles.pngImage();

      // Test minimum quality
      const minParams: ImageConversionParams = {
        targetFormat: 'jpeg',
        quality: 0
      };

      // Act
      const minResult = await ConversionService.convertImage(testFile, minParams);

      // Assert
      expect(convertImageFile).toHaveBeenCalledWith(testFile, minParams);
      expect(minResult.filename).toBe('test.jpeg');

      // Test maximum quality
      const maxParams: ImageConversionParams = {
        targetFormat: 'jpeg',
        quality: 1
      };

      await ConversionService.convertImage(testFile, maxParams);
      expect(convertImageFile).toHaveBeenCalledWith(testFile, maxParams);
    });
  });

  describe('convertVideo', () => {
    it('should convert video with all parameters', async () => {
      // Arrange
      const mockBlob = createMockBlob('converted gif', 'image/gif');
      const convertMp4ToGif = await setupVideoMock(mockBlob);
      const testFile = TestFiles.mp4Video();
      const params: VideoConversionParams = {
        width: 640,
        fps: 15,
        start: 5,
        duration: 10,
        highQuality: true
      };

      // Act
      const result = await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(convertMp4ToGif).toHaveBeenCalledWith(testFile, params);
      expect(result.blob).toBe(mockBlob);
      expect(result.filename).toBe('test.gif');
    });

    it('should handle empty string parameters as undefined', async () => {
      // Arrange
      const mockBlob = new Blob(['converted gif'], { type: 'image/gif' });
      const { convertMp4ToGif } = await import('./converters/video');
      vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);

      const testFile = TestFiles.mp4Video();
      const params: VideoConversionParams = {
        width: '',
        fps: '',
        start: '',
        duration: '',
        highQuality: false
      };

      // Act
      const result = await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(convertMp4ToGif).toHaveBeenCalledWith(testFile, {
        width: undefined,
        fps: undefined,
        start: undefined,
        duration: undefined,
        highQuality: false
      });
      expect(result.filename).toBe('test.gif');
    });

    it('should handle mixed empty and numeric parameters', async () => {
      // Arrange
      const mockBlob = new Blob(['converted gif'], { type: 'image/gif' });
      const { convertMp4ToGif } = await import('./converters/video');
      vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);

      const testFile = TestFiles.mp4Video();
      const params: VideoConversionParams = {
        width: 320,
        fps: '',
        start: 2,
        duration: '',
        highQuality: true
      };

      // Act
      await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(convertMp4ToGif).toHaveBeenCalledWith(testFile, {
        width: 320,
        fps: undefined,
        start: 2,
        duration: undefined,
        highQuality: true
      });
    });

    it('should handle video conversion errors', async () => {
      // Arrange
      const { convertMp4ToGif } = await import('./converters/video');
      const conversionError = new Error('Video conversion failed');
      vi.mocked(convertMp4ToGif).mockRejectedValue(conversionError);

      const testFile = TestFiles.mp4Video();
      const params: VideoConversionParams = {
        width: 640,
        fps: 30,
        start: 0,
        duration: 5,
        highQuality: false
      };

      // Act & Assert
      await expect(ConversionService.convertVideo(testFile, params))
        .rejects.toThrow('Video conversion failed');
    });

    it('should handle filename without extension for video', async () => {
      // Arrange
      const mockBlob = new Blob(['converted gif'], { type: 'image/gif' });
      const { convertMp4ToGif } = await import('./converters/video');
      vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);

      const testFile = MockFileFactory.createVideoFile('video-no-ext');
      const params: VideoConversionParams = {
        width: '',
        fps: '',
        start: '',
        duration: '',
        highQuality: false
      };

      // Act
      const result = await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(result.filename).toBe('video-no-ext.gif');
    });

    it('should handle zero values correctly', async () => {
      // Arrange
      const mockBlob = new Blob(['converted gif'], { type: 'image/gif' });
      const { convertMp4ToGif } = await import('./converters/video');
      vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);

      const testFile = TestFiles.mp4Video();
      const params: VideoConversionParams = {
        width: 0,
        fps: 0,
        start: 0,
        duration: 0,
        highQuality: false
      };

      // Act
      await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(convertMp4ToGif).toHaveBeenCalledWith(testFile, {
        width: 0,
        fps: 0,
        start: 0,
        duration: 0,
        highQuality: false
      });
    });
  });

  describe('filename handling', () => {
    it('should handle complex filenames correctly', async () => {
      // Arrange
      const mockBlob = new Blob(['converted'], { type: 'image/png' });
      const { convertImageFile } = await import('./converters/image');
      vi.mocked(convertImageFile).mockResolvedValue(mockBlob);

      const complexFile = MockFileFactory.createImageFile('my.complex.file.name.jpg', 'image/jpeg');
      const params: ImageConversionParams = {
        targetFormat: 'png',
        quality: 0.8
      };

      // Act
      const result = await ConversionService.convertImage(complexFile, params);

      // Assert
      expect(result.filename).toBe('my.complex.file.name.png');
    });

    it('should handle filenames with spaces and special characters', async () => {
      // Arrange
      const mockBlob = new Blob(['converted'], { type: 'image/webp' });
      const { convertImageFile } = await import('./converters/image');
      vi.mocked(convertImageFile).mockResolvedValue(mockBlob);

      const specialFile = MockFileFactory.createImageFile('My Photo (2023).jpeg', 'image/jpeg');
      const params: ImageConversionParams = {
        targetFormat: 'webp',
        quality: 0.9
      };

      // Act
      const result = await ConversionService.convertImage(specialFile, params);

      // Assert
      expect(result.filename).toBe('My Photo (2023).webp');
    });
  });

  describe('parameter validation', () => {
    it('should handle string numbers in video parameters', async () => {
      // Arrange
      const mockBlob = new Blob(['converted gif'], { type: 'image/gif' });
      const { convertMp4ToGif } = await import('./converters/video');
      vi.mocked(convertMp4ToGif).mockResolvedValue(mockBlob);

      const testFile = TestFiles.mp4Video();

      // Test with string numbers that should be converted
      const params: VideoConversionParams = {
        width: '800' as any, // Simulating form input
        fps: '24' as any,
        start: '1.5' as any,
        duration: '30' as any,
        highQuality: true
      };

      // Act
      await ConversionService.convertVideo(testFile, params);

      // Assert
      expect(convertMp4ToGif).toHaveBeenCalledWith(testFile, {
        width: 800,
        fps: 24,
        start: 1.5,
        duration: 30,
        highQuality: true
      });
    });
  });
});
