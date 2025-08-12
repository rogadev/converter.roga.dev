import { describe, it, expect } from 'vitest';
import {
  detectFileKind,
  getDefaultImageTarget,
  formatImageLabel,
  isValidImageFormat
} from './file-utils';
import { MockFileFactory, TestFiles } from './__tests__/helpers/node-test-helpers';
import type { FileKind, ImageFormat } from './types';

describe('file-utils', () => {
  describe('detectFileKind', () => {
    it('should detect image files correctly', () => {
      const jpegFile = MockFileFactory.createImageFile('test.jpg', 'image/jpeg');
      const pngFile = MockFileFactory.createImageFile('test.png', 'image/png');
      const webpFile = MockFileFactory.createImageFile('test.webp', 'image/webp');
      const avifFile = MockFileFactory.createImageFile('test.avif', 'image/avif');

      expect(detectFileKind(jpegFile)).toBe('image');
      expect(detectFileKind(pngFile)).toBe('image');
      expect(detectFileKind(webpFile)).toBe('image');
      expect(detectFileKind(avifFile)).toBe('image');
    });

    it('should detect video files correctly', () => {
      const mp4File = MockFileFactory.createVideoFile('test.mp4');
      expect(detectFileKind(mp4File)).toBe('video');
    });

    it('should detect unsupported files correctly', () => {
      const textFile = MockFileFactory.createUnsupportedFile('test.txt');
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const docFile = new File(['content'], 'test.doc', { type: 'application/msword' });

      expect(detectFileKind(textFile)).toBe('unsupported');
      expect(detectFileKind(pdfFile)).toBe('unsupported');
      expect(detectFileKind(docFile)).toBe('unsupported');
    });

    it('should handle files with generic image MIME types', () => {
      const genericImageFile = new File(['content'], 'test.img', { type: 'image/unknown' });
      expect(detectFileKind(genericImageFile)).toBe('image');
    });

    it('should handle files with no MIME type', () => {
      const noMimeFile = new File(['content'], 'test', { type: '' });
      expect(detectFileKind(noMimeFile)).toBe('unsupported');
    });

    it('should handle files with malformed MIME types', () => {
      const malformedFile = new File(['content'], 'test', { type: 'not-a-mime-type' });
      expect(detectFileKind(malformedFile)).toBe('unsupported');
    });

    it('should be case insensitive for MIME types', () => {
      const upperCaseFile = new File(['content'], 'test.jpg', { type: 'IMAGE/JPEG' });
      expect(detectFileKind(upperCaseFile)).toBe('image');
    });
  });

  describe('getDefaultImageTarget', () => {
    it('should return different format than input for common formats', () => {
      const jpegFile = MockFileFactory.createImageFile('test.jpg', 'image/jpeg');
      const pngFile = MockFileFactory.createImageFile('test.png', 'image/png');
      const webpFile = MockFileFactory.createImageFile('test.webp', 'image/webp');
      const avifFile = MockFileFactory.createImageFile('test.avif', 'image/avif');

      const jpegTarget = getDefaultImageTarget(jpegFile);
      const pngTarget = getDefaultImageTarget(pngFile);
      const webpTarget = getDefaultImageTarget(webpFile);
      const avifTarget = getDefaultImageTarget(avifFile);

      expect(jpegTarget).not.toBe('jpeg');
      expect(pngTarget).not.toBe('png');
      expect(webpTarget).not.toBe('webp');
      expect(avifTarget).not.toBe('avif');
    });

    it('should prefer modern formats (webp, avif) as targets', () => {
      const jpegFile = MockFileFactory.createImageFile('test.jpg', 'image/jpeg');
      const pngFile = MockFileFactory.createImageFile('test.png', 'image/png');

      const jpegTarget = getDefaultImageTarget(jpegFile);
      const pngTarget = getDefaultImageTarget(pngFile);

      // Should prefer webp or avif over jpeg/png
      expect(['webp', 'avif']).toContain(jpegTarget);
      expect(['webp', 'avif']).toContain(pngTarget);
    });

    it('should return webp as fallback when no other format is available', () => {
      // Create a file with an unknown image format
      const unknownFile = new File(['content'], 'test.unknown', { type: 'image/unknown' });
      const target = getDefaultImageTarget(unknownFile);
      expect(target).toBe('webp');
    });

    it('should handle edge cases with malformed MIME types', () => {
      const malformedFile = new File(['content'], 'test', { type: 'image/' });
      const target = getDefaultImageTarget(malformedFile);
      expect(target).toBe('webp');
    });

    it('should return valid ImageFormat type', () => {
      const testFile = MockFileFactory.createImageFile('test.jpg', 'image/jpeg');
      const target = getDefaultImageTarget(testFile);
      expect(['png', 'jpeg', 'webp', 'avif']).toContain(target);
    });
  });

  describe('formatImageLabel', () => {
    it('should format WebP correctly', () => {
      expect(formatImageLabel('webp')).toBe('WebP');
    });

    it('should format other formats in uppercase', () => {
      expect(formatImageLabel('jpeg')).toBe('JPEG');
      expect(formatImageLabel('png')).toBe('PNG');
      expect(formatImageLabel('avif')).toBe('AVIF');
    });

    it('should handle mixed case input', () => {
      expect(formatImageLabel('WebP')).toBe('WebP'); // Mixed case gets normalized via lookup
      expect(formatImageLabel('JPEG')).toBe('JPEG');
      expect(formatImageLabel('Png')).toBe('PNG');
    });

    it('should handle empty string', () => {
      expect(formatImageLabel('')).toBe('');
    });

    it('should handle unknown formats', () => {
      expect(formatImageLabel('unknown')).toBe('UNKNOWN');
      expect(formatImageLabel('gif')).toBe('GIF');
    });

    it('should preserve proper casing for all formats regardless of input case', () => {
      // WebP gets special casing
      expect(formatImageLabel('webp')).toBe('WebP');
      expect(formatImageLabel('WEBP')).toBe('WebP');
      expect(formatImageLabel('WebP')).toBe('WebP');
      expect(formatImageLabel('wEbP')).toBe('WebP');

      // Other formats get uppercase
      expect(formatImageLabel('jpeg')).toBe('JPEG');
      expect(formatImageLabel('JPEG')).toBe('JPEG');
      expect(formatImageLabel('png')).toBe('PNG');
      expect(formatImageLabel('PNG')).toBe('PNG');
      expect(formatImageLabel('avif')).toBe('AVIF');
      expect(formatImageLabel('AVIF')).toBe('AVIF');
    });
  });

  describe('isValidImageFormat', () => {
    it('should return true for valid image formats', () => {
      expect(isValidImageFormat('png')).toBe(true);
      expect(isValidImageFormat('jpeg')).toBe(true);
      expect(isValidImageFormat('webp')).toBe(true);
      expect(isValidImageFormat('avif')).toBe(true);
    });

    it('should return false for invalid image formats', () => {
      expect(isValidImageFormat('gif')).toBe(false);
      expect(isValidImageFormat('bmp')).toBe(false);
      expect(isValidImageFormat('tiff')).toBe(false);
      expect(isValidImageFormat('svg')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidImageFormat('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      // @ts-expect-error - testing runtime behavior
      expect(isValidImageFormat(null)).toBe(false);
      // @ts-expect-error - testing runtime behavior
      expect(isValidImageFormat(undefined)).toBe(false);
      // @ts-expect-error - testing runtime behavior
      expect(isValidImageFormat(123)).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidImageFormat('PNG')).toBe(false);
      expect(isValidImageFormat('JPEG')).toBe(false);
      expect(isValidImageFormat('WebP')).toBe(false);
    });

    it('should provide proper type narrowing', () => {
      const format: string = 'webp';

      if (isValidImageFormat(format)) {
        // TypeScript should narrow the type to ImageFormat
        const validFormat: ImageFormat = format;
        expect(validFormat).toBe('webp');
      }
    });
  });

  describe('integration tests', () => {
    it('should work together for complete file processing workflow', () => {
      const testFiles = MockFileFactory.createTestFileSet();

      // Test image file workflow
      const imageKind = detectFileKind(testFiles.smallImage);
      expect(imageKind).toBe('image');

      const defaultTarget = getDefaultImageTarget(testFiles.smallImage);
      expect(isValidImageFormat(defaultTarget)).toBe(true);

      const formattedLabel = formatImageLabel(defaultTarget);
      expect(formattedLabel.length).toBeGreaterThan(0);

      // Test video file workflow
      const videoKind = detectFileKind(testFiles.video);
      expect(videoKind).toBe('video');

      // Test unsupported file workflow
      const unsupportedKind = detectFileKind(testFiles.unsupported);
      expect(unsupportedKind).toBe('unsupported');
    });

    it('should handle edge cases consistently', () => {
      const edgeCaseFile = MockFileFactory.createFileWithoutExtension('noext', 'image/jpeg');

      const kind = detectFileKind(edgeCaseFile);
      expect(kind).toBe('image');

      const target = getDefaultImageTarget(edgeCaseFile);
      expect(isValidImageFormat(target)).toBe(true);

      const label = formatImageLabel(target);
      expect(label).toBeTruthy();
    });

    it('should maintain type safety across all functions', () => {
      const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif'];

      formats.forEach(format => {
        expect(isValidImageFormat(format)).toBe(true);

        const label = formatImageLabel(format);
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });
});
