import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { humanFileSize, renameFile } from './web';
import fs from 'fs/promises';
import path from 'path';

describe('Converter Utilities (Node.js compatible)', () => {
  const resultsDir = path.join(process.cwd(), 'test-results');

  beforeAll(async () => {
    // Create results directory for test outputs
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      console.log('Created test results directory');
    } catch (error) {
      console.warn('Could not create test results directory:', error);
    }
  });

  afterAll(async () => {
    // Clean up results directory after tests using newer fs.rm
    try {
      await fs.rm(resultsDir, { recursive: true, force: true });
      console.log('✓ Cleaned up test results directory');
    } catch (error) {
      console.warn('Warning: Could not clean up test results directory:', error);
    }
  });

  describe('humanFileSize', () => {
    it('should format bytes correctly', () => {
      expect(humanFileSize(0)).toBe('0 B');
      expect(humanFileSize(1024)).toBe('1.0 KB');
      expect(humanFileSize(1536)).toBe('1.5 KB');
      expect(humanFileSize(1048576)).toBe('1.0 MB');
      expect(humanFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle large numbers', () => {
      expect(humanFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
      expect(humanFileSize(1536 * 1024 * 1024 * 1024)).toBe('1.5 TB');
    });

    it('should handle decimal precision', () => {
      expect(humanFileSize(1234567)).toBe('1.2 MB');
      expect(humanFileSize(987654321)).toBe('941.9 MB');
    });

    it('should handle edge cases', () => {
      expect(humanFileSize(0)).toBe('0 B');
      expect(humanFileSize(512)).toBe('512 B');
      expect(humanFileSize(1023)).toBe('1023 B');
    });
  });

  describe('renameFile', () => {
    it('should replace file extension correctly', () => {
      expect(renameFile('image.png', 'webp')).toBe('image.webp');
      expect(renameFile('video.mp4', 'gif')).toBe('video.gif');
      expect(renameFile('document.pdf', 'txt')).toBe('document.txt');
    });

    it('should handle files without extensions', () => {
      expect(renameFile('filename', 'png')).toBe('filename.png');
      expect(renameFile('no-extension', 'webp')).toBe('no-extension.webp');
    });

    it('should handle multiple dots in filename', () => {
      expect(renameFile('file.name.with.dots.jpg', 'png')).toBe('file.name.with.dots.png');
      expect(renameFile('archive.tar.gz', 'zip')).toBe('archive.tar.zip');
    });

    it('should handle complex filenames', () => {
      expect(renameFile('My Photo (1).jpeg', 'webp')).toBe('My Photo (1).webp');
      expect(renameFile('file-with-dashes_and_underscores.png', 'avif')).toBe('file-with-dashes_and_underscores.avif');
    });

    it('should handle edge cases', () => {
      expect(renameFile('', 'png')).toBe('.png');
      expect(renameFile('.', 'webp')).toBe('.webp');
      expect(renameFile('..', 'gif')).toBe('..gif');
      expect(renameFile('.hidden', 'jpg')).toBe('.jpg'); // .hidden has no extension, so becomes .jpg
    });
  });

  describe('File System Integration', () => {
    it('should be able to create and write test files', async () => {
      const testContent = 'This is a test file content';
      const testFile = path.join(resultsDir, 'test-file.txt');

      await fs.writeFile(testFile, testContent);
      const readContent = await fs.readFile(testFile, 'utf-8');

      expect(readContent).toBe(testContent);
    });

    it('should be able to list sample files', async () => {
      const sampleDir = path.join(process.cwd(), 'sample-files');
      const files = await fs.readdir(sampleDir);

      expect(files).toContain('mp4-to-gif.mp4');
      expect(files).toContain('png-image.png');
      expect(files).toContain('big-jpg-image.jpg');
      expect(files.length).toBeGreaterThan(0);

      console.log('Available sample files:', files);
    });

    it('should calculate correct file sizes for sample files', async () => {
      const sampleDir = path.join(process.cwd(), 'sample-files');
      const files = await fs.readdir(sampleDir);

      for (const file of files) {
        const filePath = path.join(sampleDir, file);
        const stats = await fs.stat(filePath);
        const formattedSize = humanFileSize(stats.size);

        expect(stats.size).toBeGreaterThan(0);
        expect(formattedSize).toMatch(/^(\d+\.\d+|\d+)\s+(B|KB|MB|GB|TB)$/);

        console.log(`${file}: ${formattedSize} (${stats.size} bytes)`);
      }
    });
  });

  describe('Workflow Integration', () => {
    it('should work together for complete conversion workflow simulation', () => {
      const originalFilename = 'sample-video.mp4';
      const targetFormat = 'gif';
      const fileSize = 2 * 1024 * 1024; // 2MB

      const newFilename = renameFile(originalFilename, targetFormat);
      const sizeString = humanFileSize(fileSize);

      expect(newFilename).toBe('sample-video.gif');
      expect(sizeString).toBe('2.0 MB');

      // Simulate multiple conversion formats
      const formats = ['webp', 'avif', 'png', 'gif'];
      const originalImageFilename = 'photo.jpg';

      formats.forEach(format => {
        const converted = renameFile(originalImageFilename, format);
        expect(converted).toBe(`photo.${format}`);
      });
    });

    it('should handle batch processing workflow', () => {
      const files = [
        'image1.jpg',
        'image2.png',
        'video1.mp4',
        'document.pdf'
      ];

      const targetFormats = ['webp', 'webp', 'gif', 'txt'];

      const results = files.map((file, index) => ({
        original: file,
        converted: renameFile(file, targetFormats[index]),
        size: humanFileSize(Math.floor(Math.random() * 5000000)) // Random size up to 5MB
      }));

      expect(results).toHaveLength(4);
      expect(results[0].converted).toBe('image1.webp');
      expect(results[1].converted).toBe('image2.webp');
      expect(results[2].converted).toBe('video1.gif');
      expect(results[3].converted).toBe('document.txt');
    });
  });
});
