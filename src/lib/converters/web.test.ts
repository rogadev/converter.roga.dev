import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { humanFileSize, renameFile, downloadBlob } from './web';

describe('web utilities', () => {
  describe('humanFileSize', () => {
    it('should format bytes correctly', () => {
      expect(humanFileSize(0)).toBe('0 B');
      expect(humanFileSize(1)).toBe('1 B');
      expect(humanFileSize(512)).toBe('512 B');
      expect(humanFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(humanFileSize(1024)).toBe('1.0 KB');
      expect(humanFileSize(1536)).toBe('1.5 KB');
      expect(humanFileSize(2048)).toBe('2.0 KB');
      expect(humanFileSize(1234)).toBe('1.2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(humanFileSize(1048576)).toBe('1.0 MB'); // 1024^2
      expect(humanFileSize(1572864)).toBe('1.5 MB'); // 1.5 * 1024^2
      expect(humanFileSize(1234567)).toBe('1.2 MB');
      expect(humanFileSize(10485760)).toBe('10.0 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(humanFileSize(1073741824)).toBe('1.0 GB'); // 1024^3
      expect(humanFileSize(1610612736)).toBe('1.5 GB'); // 1.5 * 1024^3
      expect(humanFileSize(2147483648)).toBe('2.0 GB'); // 2 * 1024^3
    });

    it('should format terabytes correctly', () => {
      expect(humanFileSize(1099511627776)).toBe('1.0 TB'); // 1024^4
      expect(humanFileSize(1649267441664)).toBe('1.5 TB'); // 1.5 * 1024^4
    });

    it('should handle negative numbers', () => {
      expect(humanFileSize(-1024)).toBe('-1.0 KB');
      expect(humanFileSize(-1048576)).toBe('-1.0 MB');
      expect(humanFileSize(-512)).toBe('-512 B');
    });

    it('should handle very large numbers', () => {
      const veryLarge = 1024 * 1024 * 1024 * 1024 * 1024; // 1024^5 (beyond TB)
      const result = humanFileSize(veryLarge);
      expect(result).toMatch(/^\d+\.\d+ TB$/);
    });

    it('should handle decimal precision correctly', () => {
      expect(humanFileSize(1234567890)).toBe('1.1 GB');
      expect(humanFileSize(987654321)).toBe('941.9 MB');
      expect(humanFileSize(123456)).toBe('120.6 KB');
    });

    it('should handle edge cases', () => {
      expect(humanFileSize(1023.9)).toBe('1023.9 B'); // Decimal bytes are preserved
      expect(humanFileSize(1024.1)).toBe('1.0 KB'); // Should round to KB
    });

    it('should maintain consistent decimal places', () => {
      const results = [
        humanFileSize(1024),
        humanFileSize(1048576),
        humanFileSize(1073741824),
        humanFileSize(1099511627776)
      ];

      results.forEach(result => {
        if (!result.endsWith(' B')) {
          expect(result).toMatch(/^\d+\.\d+ (KB|MB|GB|TB)$/);
        }
      });
    });
  });

  describe('renameFile', () => {
    it('should replace file extension correctly', () => {
      expect(renameFile('image.png', 'webp')).toBe('image.webp');
      expect(renameFile('video.mp4', 'gif')).toBe('video.gif');
      expect(renameFile('document.pdf', 'txt')).toBe('document.txt');
      expect(renameFile('photo.jpeg', 'avif')).toBe('photo.avif');
    });

    it('should handle files without extensions', () => {
      expect(renameFile('filename', 'png')).toBe('filename.png');
      expect(renameFile('no-extension', 'webp')).toBe('no-extension.webp');
      expect(renameFile('README', 'md')).toBe('README.md');
    });

    it('should handle multiple dots in filename', () => {
      expect(renameFile('file.name.with.dots.jpg', 'png')).toBe('file.name.with.dots.png');
      expect(renameFile('archive.tar.gz', 'zip')).toBe('archive.tar.zip');
      expect(renameFile('version.1.2.3.txt', 'md')).toBe('version.1.2.3.md');
    });

    it('should handle complex filenames', () => {
      expect(renameFile('My Photo (1).jpeg', 'webp')).toBe('My Photo (1).webp');
      expect(renameFile('file-with-dashes_and_underscores.png', 'avif')).toBe('file-with-dashes_and_underscores.avif');
      expect(renameFile('file with spaces.jpg', 'gif')).toBe('file with spaces.gif');
    });

    it('should handle edge cases', () => {
      expect(renameFile('', 'png')).toBe('.png');
      expect(renameFile('.', 'webp')).toBe('..webp'); // . becomes ..webp
      expect(renameFile('..', 'gif')).toBe('..gif');
      expect(renameFile('.hidden', 'jpg')).toBe('.hidden.jpg'); // .hidden has no extension, so becomes .hidden.jpg
      expect(renameFile('file.', 'png')).toBe('file.png'); // trailing dot
    });

    it('should handle files starting with dots', () => {
      expect(renameFile('.gitignore', 'txt')).toBe('.gitignore.txt'); // No extension found
      expect(renameFile('.env.local', 'backup')).toBe('.env.backup');
      expect(renameFile('.config.json', 'yaml')).toBe('.config.yaml');
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '.txt';
      const result = renameFile(longName, 'md');
      expect(result).toBe('a'.repeat(200) + '.md');
    });

    it('should handle special characters', () => {
      expect(renameFile('file@#$%^&*().txt', 'md')).toBe('file@#$%^&*().md');
      expect(renameFile('файл.txt', 'md')).toBe('файл.md'); // Unicode
      expect(renameFile('文件.txt', 'md')).toBe('文件.md'); // Chinese characters
    });

    it('should preserve case in filename base', () => {
      expect(renameFile('MyFile.TXT', 'png')).toBe('MyFile.png');
      expect(renameFile('UPPERCASE.jpg', 'webp')).toBe('UPPERCASE.webp');
    });

    it('should handle new extension with dots', () => {
      expect(renameFile('file.txt', 'tar.gz')).toBe('file.tar.gz');
      expect(renameFile('backup.sql', 'sql.bak')).toBe('backup.sql.bak');
    });
  });

  describe('downloadBlob', () => {
    let mockCreateElement: ReturnType<typeof vi.fn>;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockRemoveChild: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let mockAnchor: any;

    beforeEach(() => {
      // Mock DOM methods
      mockClick = vi.fn();
      mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        remove: vi.fn()
      };

      mockCreateElement = vi.fn(() => mockAnchor);
      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();

      // Mock document
      Object.defineProperty(global, 'document', {
        value: {
          createElement: mockCreateElement,
          body: {
            appendChild: mockAppendChild,
            removeChild: mockRemoveChild
          }
        },
        writable: true
      });

      // Mock URL methods
      mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      mockRevokeObjectURL = vi.fn();

      Object.defineProperty(global, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL
        },
        writable: true
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create and configure anchor element correctly', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toBe(filename);
    });

    it('should create object URL from blob', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    it('should trigger download by clicking anchor', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockAnchor.remove).toHaveBeenCalled();
    });

    it('should clean up object URL after download', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle different blob types', () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' });

      downloadBlob(imageBlob, 'image.jpg');
      downloadBlob(videoBlob, 'video.mp4');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in filename', () => {
      const blob = new Blob(['content'], { type: 'text/plain' });
      const specialFilename = 'file with spaces & symbols (1).txt';

      downloadBlob(blob, specialFilename);

      expect(mockAnchor.download).toBe(specialFilename);
    });

    it('should handle empty filename', () => {
      const blob = new Blob(['content'], { type: 'text/plain' });

      downloadBlob(blob, '');

      expect(mockAnchor.download).toBe('');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle large blobs', () => {
      const largeContent = new Uint8Array(10 * 1024 * 1024); // 10MB
      const blob = new Blob([largeContent], { type: 'application/octet-stream' });

      downloadBlob(blob, 'large-file.bin');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should complete full download workflow', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      // Verify complete workflow
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toBe(filename);
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockAnchor.remove).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('integration tests', () => {
    it('should work together for file conversion workflow', () => {
      // Simulate a conversion workflow
      const originalSize = 2 * 1024 * 1024; // 2MB
      const convertedSize = 1.5 * 1024 * 1024; // 1.5MB

      const originalSizeString = humanFileSize(originalSize);
      const convertedSizeString = humanFileSize(convertedSize);

      expect(originalSizeString).toBe('2.0 MB');
      expect(convertedSizeString).toBe('1.5 MB');

      const newFilename = renameFile('photo.jpg', 'webp');
      expect(newFilename).toBe('photo.webp');
    });

    it('should handle batch file processing', () => {
      const files = [
        { name: 'image1.jpg', size: 1024 * 1024 },
        { name: 'image2.png', size: 2 * 1024 * 1024 },
        { name: 'video.mp4', size: 50 * 1024 * 1024 }
      ];

      const results = files.map(file => ({
        original: file.name,
        size: humanFileSize(file.size),
        webp: renameFile(file.name, 'webp'),
        gif: renameFile(file.name, 'gif')
      }));

      expect(results[0].size).toBe('1.0 MB');
      expect(results[1].size).toBe('2.0 MB');
      expect(results[2].size).toBe('50.0 MB');

      expect(results[0].webp).toBe('image1.webp');
      expect(results[1].webp).toBe('image2.webp');
      expect(results[2].gif).toBe('video.gif');
    });

    it('should maintain consistency across utility functions', () => {
      const testCases = [
        { name: 'simple.jpg', size: 1024 },
        { name: 'complex.file.name.png', size: 1048576 },
        { name: 'no-extension', size: 2048 },
        { name: '.hidden.txt', size: 512 }
      ];

      testCases.forEach(testCase => {
        const sizeString = humanFileSize(testCase.size);
        const renamedFile = renameFile(testCase.name, 'webp');

        expect(typeof sizeString).toBe('string');
        expect(sizeString.length).toBeGreaterThan(0);
        expect(typeof renamedFile).toBe('string');
        expect(renamedFile.endsWith('.webp')).toBe(true);
      });
    });
  });
});
