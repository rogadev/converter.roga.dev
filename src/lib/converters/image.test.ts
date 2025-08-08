import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { convertImageFile, type ImageFormat } from './image';
import fs from 'fs/promises';
import path from 'path';

describe('Image Converter', () => {
  const sampleDir = path.join(process.cwd(), 'sample-files');
  const resultsDir = path.join(process.cwd(), 'test-results');
  
  beforeAll(async () => {
    // Create results directory for test outputs
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // Clean up results directory after tests
    try {
      await fs.rmdir(resultsDir, { recursive: true });
      console.log('✓ Cleaned up test results directory');
    } catch (error) {
      console.warn('Warning: Could not clean up test results directory:', error);
    }
  });

  async function loadSampleFile(filename: string): Promise<File> {
    const filePath = path.join(sampleDir, filename);
    const buffer = await fs.readFile(filePath);
    const mimeType = getMimeType(filename);
    return new File([buffer], filename, { type: mimeType });
  }

  function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.svg':
        return 'image/svg+xml';
      case '.ico':
        return 'image/x-icon';
      default:
        return 'application/octet-stream';
    }
  }

  async function saveTestResult(blob: Blob, filename: string): Promise<void> {
    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(path.join(resultsDir, filename), buffer);
  }

  describe('PNG Conversion', () => {
    it('should convert PNG to WebP', async () => {
      const file = await loadSampleFile('png-image.png');
      const result = await convertImageFile(file, { format: 'webp', quality: 80 });
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'png-to-webp.webp');
    });

    it('should convert PNG to AVIF', async () => {
      const file = await loadSampleFile('png-image.png');
      const result = await convertImageFile(file, { format: 'avif', quality: 80 });
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/avif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'png-to-avif.avif');
    });
  });

  describe('JPEG Conversion', () => {
    it('should convert JPEG to WebP', async () => {
      const file = await loadSampleFile('big-jpg-image.jpg');
      const result = await convertImageFile(file, { format: 'webp', quality: 85 });
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
      expect(result.size).toBeLessThan(file.size); // Should be compressed
      
      await saveTestResult(result, 'jpg-to-webp.webp');
    });

    it('should convert JPEG to AVIF', async () => {
      const file = await loadSampleFile('big-jpg-image.jpg');
      const result = await convertImageFile(file, { format: 'avif', quality: 85 });
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/avif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'jpg-to-avif.avif');
    });
  });

  describe('GIF Conversion', () => {
    it('should convert GIF to WebP', async () => {
      const file = await loadSampleFile('animated-gif-image.gif');
      const result = await convertImageFile(file, { format: 'webp', quality: 80 });
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'gif-to-webp.webp');
    });
  });

  describe('Quality Settings', () => {
    it('should produce different file sizes with different quality settings', async () => {
      const file = await loadSampleFile('big-jpg-image.jpg');
      
      const lowQuality = await convertImageFile(file, { format: 'webp', quality: 30 });
      const highQuality = await convertImageFile(file, { format: 'webp', quality: 95 });
      
      expect(lowQuality.size).toBeLessThan(highQuality.size);
      
      await saveTestResult(lowQuality, 'jpg-to-webp-low.webp');
      await saveTestResult(highQuality, 'jpg-to-webp-high.webp');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image files gracefully', async () => {
      // Create a fake file with wrong content
      const fakeFile = new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' });
      
      await expect(convertImageFile(fakeFile, { format: 'webp' }))
        .rejects
        .toThrow();
    });

    it('should handle unsupported formats', async () => {
      const file = await loadSampleFile('png-image.png');
      
      await expect(convertImageFile(file, { format: 'unsupported' as ImageFormat }))
        .rejects
        .toThrow();
    });
  });
});
