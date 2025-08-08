import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { convertMp4ToGif, type Mp4ToGifOptions } from './video';
import fs from 'fs/promises';
import path from 'path';

describe('Video Converter', () => {
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

  async function loadSampleVideo(): Promise<File> {
    const filePath = path.join(sampleDir, 'mp4-to-gif.mp4');
    const buffer = await fs.readFile(filePath);
    return new File([buffer], 'mp4-to-gif.mp4', { type: 'video/mp4' });
  }

  async function saveTestResult(blob: Blob, filename: string): Promise<void> {
    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(path.join(resultsDir, filename), buffer);
  }

  describe('Basic MP4 to GIF Conversion', () => {
    it('should convert MP4 to GIF with default settings', async () => {
      const file = await loadSampleVideo();
      const result = await convertMp4ToGif(file);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-default.gif');
    }, 30000); // 30 second timeout for video processing

    it('should convert MP4 to GIF with custom width', async () => {
      const file = await loadSampleVideo();
      const options: Mp4ToGifOptions = { width: 320 };
      const result = await convertMp4ToGif(file, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-320w.gif');
    }, 30000);

    it('should convert MP4 to GIF with custom FPS', async () => {
      const file = await loadSampleVideo();
      const options: Mp4ToGifOptions = { fps: 15 };
      const result = await convertMp4ToGif(file, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-15fps.gif');
    }, 30000);
  });

  describe('Advanced Options', () => {
    it('should convert with time trimming (start and duration)', async () => {
      const file = await loadSampleVideo();
      const options: Mp4ToGifOptions = { 
        start: 1, // Start at 1 second
        duration: 3 // 3 seconds duration
      };
      const result = await convertMp4ToGif(file, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-trimmed.gif');
    }, 30000);

    it('should convert with high quality settings', async () => {
      const file = await loadSampleVideo();
      const standardOptions: Mp4ToGifOptions = { width: 240, fps: 10 };
      const highQualityOptions: Mp4ToGifOptions = { 
        width: 240, 
        fps: 10, 
        highQuality: true 
      };
      
      const [standardResult, highQualityResult] = await Promise.all([
        convertMp4ToGif(file, standardOptions),
        convertMp4ToGif(file, highQualityOptions)
      ]);
      
      expect(standardResult).toBeInstanceOf(Blob);
      expect(highQualityResult).toBeInstanceOf(Blob);
      expect(standardResult.type).toBe('image/gif');
      expect(highQualityResult.type).toBe('image/gif');
      
      // High quality should typically produce larger files
      expect(highQualityResult.size).toBeGreaterThan(standardResult.size * 0.8);
      
      await saveTestResult(standardResult, 'mp4-to-gif-standard.gif');
      await saveTestResult(highQualityResult, 'mp4-to-gif-hq.gif');
    }, 45000);
  });

  describe('Edge Cases', () => {
    it('should handle very short duration', async () => {
      const file = await loadSampleVideo();
      const options: Mp4ToGifOptions = { 
        start: 0,
        duration: 0.5 // Half second
      };
      const result = await convertMp4ToGif(file, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-short.gif');
    }, 30000);

    it('should handle very low FPS', async () => {
      const file = await loadSampleVideo();
      const options: Mp4ToGifOptions = { fps: 3 };
      const result = await convertMp4ToGif(file, options);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-3fps.gif');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid video files gracefully', async () => {
      // Create a fake MP4 file with wrong content
      const fakeFile = new File(['not a video'], 'fake.mp4', { type: 'video/mp4' });
      
      await expect(convertMp4ToGif(fakeFile))
        .rejects
        .toThrow(/Failed to convert MP4 to GIF/);
    }, 15000);

    it('should handle empty options object', async () => {
      const file = await loadSampleVideo();
      const result = await convertMp4ToGif(file, {});
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(result.size).toBeGreaterThan(0);
      
      await saveTestResult(result, 'mp4-to-gif-empty-options.gif');
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should complete conversion in reasonable time', async () => {
      const file = await loadSampleVideo();
      const startTime = Date.now();
      
      const result = await convertMp4ToGif(file, { width: 200, fps: 8 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBeInstanceOf(Blob);
      expect(duration).toBeLessThan(25000); // Should complete within 25 seconds
      
      console.log(`Conversion completed in ${duration}ms`);
      await saveTestResult(result, 'mp4-to-gif-perf.gif');
    }, 30000);
  });
});
