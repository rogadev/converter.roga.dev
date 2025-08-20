import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertMp4ToGif, type Mp4ToGifOptions } from './video';
import { MockFileFactory, TestFiles } from '../__tests__/helpers/mock-file-factory';

// Mock FFmpeg modules
const mockFFmpeg = {
  load: vi.fn(),
  writeFile: vi.fn(),
  exec: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn()
};

const mockFetchFile = vi.fn();

// Mock the dynamic imports
vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn(() => mockFFmpeg)
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: mockFetchFile
}));

describe('Video Converter', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockFFmpeg.load.mockResolvedValue(undefined);
    mockFFmpeg.writeFile.mockResolvedValue(undefined);
    mockFFmpeg.exec.mockResolvedValue(undefined);
    mockFFmpeg.readFile.mockResolvedValue(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])); // GIF header
    mockFFmpeg.deleteFile.mockResolvedValue(undefined);
    mockFetchFile.mockResolvedValue(new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])); // MP4 header
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertMp4ToGif', () => {
    it('should convert MP4 to GIF with default options', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {};

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/gif');
      expect(mockFFmpeg.load).toHaveBeenCalled();
      expect(mockFFmpeg.writeFile).toHaveBeenCalledWith('input.mp4', expect.any(Uint8Array));
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=12,scale=iw:ih:flags=lanczos',
        '-y', 'output.gif'
      ]);
      expect(mockFFmpeg.readFile).toHaveBeenCalledWith('output.gif');
    });

    it('should handle custom width option', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 640
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=12,scale=640:-1:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle custom fps option', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        fps: 24
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=24,scale=iw:ih:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle start time option', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        start: 5.5
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      expect(lastCall).toContain('-ss');
      expect(lastCall).toContain('5.5');
    });

    it('should handle duration option', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        duration: 10
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      expect(lastCall).toContain('-t');
      expect(lastCall).toContain('10');
    });

    it('should handle combined start and duration options', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        start: 2,
        duration: 8
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      expect(lastCall).toContain('-ss');
      expect(lastCall).toContain('2');
      expect(lastCall).toContain('-t');
      expect(lastCall).toContain('8');
    });

    it('should handle all options combined', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 480,
        fps: 15,
        start: 1,
        duration: 5,
        highQuality: false
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      const flat = Array.isArray(lastCall) ? lastCall.join(' ') : String(lastCall);
      expect(flat).toContain('-ss');
      expect(flat).toContain('1');
      expect(flat).toContain('-t');
      expect(flat).toContain('5');
      expect(flat).toContain('fps=15');
      expect(flat).toContain('scale=480:-1');
    });

    it('should handle high quality conversion with palette generation', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 640,
        fps: 20,
        highQuality: true
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledTimes(2);

      // First call: palette generation
      expect(mockFFmpeg.exec).toHaveBeenNthCalledWith(1, [
        '-i', 'input.mp4',
        '-vf', 'fps=20,scale=640:-1:flags=lanczos,palettegen=stats_mode=full',
        '-y', 'palette.png'
      ]);

      // Second call: conversion with palette
      expect(mockFFmpeg.exec).toHaveBeenNthCalledWith(2, [
        '-i', 'input.mp4',
        '-i', 'palette.png',
        '-lavfi', 'fps=20,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3',
        '-y', 'output.gif'
      ]);
    });

    it('should clean up files after conversion', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {};

      // Act
      await convertMp4ToGif(testFile, options);

      // Assert
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('input.mp4');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('output.gif');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledTimes(2);
    });

    it('should clean up palette file in high quality mode', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        highQuality: true
      };

      // Act
      await convertMp4ToGif(testFile, options);

      // Assert
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('input.mp4');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('palette.png');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledWith('output.gif');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledTimes(3);
    });

    it('should handle palette cleanup failure gracefully', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        highQuality: true
      };

      // Mock palette deletion failure
      mockFFmpeg.deleteFile.mockImplementation((filename: string) => {
        if (filename === 'palette.png') {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.resolve();
      });

      // Act & Assert - should not throw
      const result = await convertMp4ToGif(testFile, options);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle FFmpeg load failure', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const loadError = new Error('Failed to load FFmpeg core');
      mockFFmpeg.load.mockRejectedValue(loadError);

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Failed to load FFmpeg core');
    });

    it('should handle file write failure', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const writeError = new Error('Failed to write file');
      mockFFmpeg.writeFile.mockRejectedValue(writeError);

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Failed to write file');
    });

    it('should handle FFmpeg execution failure', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const execError = new Error('FFmpeg execution failed');
      mockFFmpeg.exec.mockRejectedValue(execError);

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: FFmpeg execution failed');
    });

    it('should handle output file read failure', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const readError = new Error('Failed to read output file');
      mockFFmpeg.readFile.mockRejectedValue(readError);

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Failed to read output file');
    });

    it('should handle fetchFile failure', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const fetchError = new Error('Failed to fetch file');
      mockFetchFile.mockRejectedValue(fetchError);

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Failed to fetch file');
    });

    it('should handle zero values correctly', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 0,
        fps: 0,
        start: 0,
        duration: 0
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      const flat = Array.isArray(lastCall) ? lastCall.join(' ') : String(lastCall);
      expect(flat).toContain('-ss');
      expect(flat).toContain('0');
      expect(flat).toContain('-t');
      expect(flat).toContain('0');
      expect(flat).toContain('fps=0');
      expect(flat).toContain('scale=0:-1');
    });

    it('should handle undefined vs null values correctly', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: undefined,
        fps: undefined,
        start: undefined,
        duration: undefined
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=12,scale=iw:ih:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle large video files', async () => {
      // Arrange
      const largeVideoFile = MockFileFactory.createLargeFile('large-video.mp4', 'video/mp4', 100);
      const options: Mp4ToGifOptions = {
        width: 320,
        fps: 10
      };

      // Act
      const result = await convertMp4ToGif(largeVideoFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFetchFile).toHaveBeenCalledWith(largeVideoFile);
    });

    it('should handle corrupted video files', async () => {
      // Arrange
      const corruptedFile = MockFileFactory.createCorruptedFile('corrupted.mp4', 'video/mp4');
      const execError = new Error('Invalid data found when processing input');
      mockFFmpeg.exec.mockRejectedValue(execError);

      // Act & Assert
      await expect(convertMp4ToGif(corruptedFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Invalid data found when processing input');
    });

    it('should handle decimal values for timing parameters', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        start: 1.5,
        duration: 3.75
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      // Check that exec was called with the correct arguments
      const execCalls = mockFFmpeg.exec.mock.calls;
      expect(execCalls.length).toBeGreaterThan(0);
      const lastCall = execCalls[execCalls.length - 1][0];
      expect(lastCall).toContain('-ss');
      expect(lastCall).toContain('1.5');
      expect(lastCall).toContain('-t');
      expect(lastCall).toContain('3.75');
    });

    it('should handle high fps values', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        fps: 60
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=60,scale=iw:ih:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle very small width values', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 1
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=12,scale=1:-1:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle very large width values', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      const options: Mp4ToGifOptions = {
        width: 4096
      };

      // Act
      const result = await convertMp4ToGif(testFile, options);

      // Assert
      expect(result).toBeInstanceOf(Blob);
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.mp4',
        '-vf', 'fps=12,scale=4096:-1:flags=lanczos',
        '-y', 'output.gif'
      ]);
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const testFile = TestFiles.mp4Video();
      mockFFmpeg.load.mockRejectedValue('String error');

      // Act & Assert
      await expect(convertMp4ToGif(testFile, {}))
        .rejects.toThrow('Failed to convert MP4 to GIF: Unknown error');
    });
  });
});
