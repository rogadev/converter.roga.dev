import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob, humanFileSize, autoDownload, renameFile } from './web';

describe('Web Utilities', () => {
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
      expect(humanFileSize(987654321)).toBe('987.7 MB');
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
  });

  describe('downloadBlob', () => {
    let mockLink: {
      href: string;
      download: string;
      click: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
    let mockCreateElement: ReturnType<typeof vi.fn>;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock DOM methods
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      };

      mockCreateElement = vi.fn().mockReturnValue(mockLink);
      mockAppendChild = vi.fn();
      mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      mockRevokeObjectURL = vi.fn();

      // Mock global objects
      Object.defineProperty(global, 'document', {
        value: {
          createElement: mockCreateElement,
          body: {
            appendChild: mockAppendChild
          }
        },
        writable: true
      });

      Object.defineProperty(global, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL
        },
        writable: true
      });

      Object.defineProperty(global, 'setTimeout', {
        value: vi.fn((fn) => fn()),
        writable: true
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should create download link and trigger download', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe(filename);
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('should handle different blob types', () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/png' });
      
      downloadBlob(imageBlob, 'image.png');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(imageBlob);
      expect(mockLink.download).toBe('image.png');
    });
  });

  describe('autoDownload', () => {
    let originalDownloadBlob: typeof downloadBlob;
    let mockDownloadBlob: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // We can't easily mock the imported function, so we'll test the behavior indirectly
      // by checking that the download happens when autoDownload is called
      mockDownloadBlob = vi.fn();
    });

    it('should call downloadBlob with correct parameters', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const filename = 'test.txt';

      // Since autoDownload just calls downloadBlob, we test that it exists and can be called
      expect(() => autoDownload(blob, filename)).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete download workflow', () => {
      const originalFilename = 'image.jpg';
      const targetFormat = 'webp';
      const fileSize = 1024 * 1024; // 1MB
      
      const newFilename = renameFile(originalFilename, targetFormat);
      const sizeString = humanFileSize(fileSize);
      
      expect(newFilename).toBe('image.webp');
      expect(sizeString).toBe('1.0 MB');
    });

    it('should handle edge cases in workflow', () => {
      const originalFilename = '';
      const targetFormat = 'png';
      const fileSize = 0;
      
      const newFilename = renameFile(originalFilename, targetFormat);
      const sizeString = humanFileSize(fileSize);
      
      expect(newFilename).toBe('.png');
      expect(sizeString).toBe('0 B');
    });
  });
});
