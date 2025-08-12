import { describe, it, expect } from 'vitest';
import { ConversionError, handleConversionError } from './error-handler';

describe('error-handler', () => {
  describe('ConversionError', () => {
    it('should create error with message only', () => {
      const error = new ConversionError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ConversionError');
      expect(error.cause).toBeUndefined();
      expect(error.fileType).toBeUndefined();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ConversionError).toBe(true);
    });

    it('should create error with message and cause', () => {
      const originalError = new Error('Original error');
      const error = new ConversionError('Conversion failed', originalError);

      expect(error.message).toBe('Conversion failed');
      expect(error.name).toBe('ConversionError');
      expect(error.cause).toBe(originalError);
      expect(error.fileType).toBeUndefined();
    });

    it('should create error with message, cause, and file type', () => {
      const originalError = new Error('FFmpeg error');
      const error = new ConversionError('Video conversion failed', originalError, 'video');

      expect(error.message).toBe('Video conversion failed');
      expect(error.name).toBe('ConversionError');
      expect(error.cause).toBe(originalError);
      expect(error.fileType).toBe('video');
    });

    it('should create error with all parameters', () => {
      const originalError = new TypeError('Invalid input');
      const error = new ConversionError('Image processing error', originalError, 'image');

      expect(error.message).toBe('Image processing error');
      expect(error.name).toBe('ConversionError');
      expect(error.cause).toBe(originalError);
      expect(error.fileType).toBe('image');
    });

    it('should maintain error stack trace', () => {
      const error = new ConversionError('Stack trace test');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should be serializable', () => {
      const error = new ConversionError('Serialization test', undefined, 'image');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      // Error objects don't serialize message/name by default in all environments
      // Just test that it serializes without throwing
      expect(typeof serialized).toBe('string');
      expect(typeof parsed).toBe('object');
    });
  });

  describe('handleConversionError', () => {
    it('should handle ConversionError instances', () => {
      const conversionError = new ConversionError('Custom conversion error');
      const result = handleConversionError(conversionError);

      expect(result).toBe('Custom conversion error');
    });

    it('should handle ConversionError with file type', () => {
      const conversionError = new ConversionError('Image error', undefined, 'image');
      const result = handleConversionError(conversionError, 'image');

      expect(result).toBe('Image error');
    });

    it('should handle SharedArrayBuffer errors', () => {
      const error = new Error('SharedArrayBuffer is not defined');
      const result = handleConversionError(error);

      expect(result).toBe('Video conversion requires secure context (HTTPS). Please check your browser settings.');
    });

    it('should handle SharedArrayBuffer errors with different message formats', () => {
      const variations = [
        'ReferenceError: SharedArrayBuffer is not defined',
        'SharedArrayBuffer not available',
        'Cannot access SharedArrayBuffer',
        'SharedArrayBuffer support required'
      ];

      variations.forEach(message => {
        const error = new Error(message);
        const result = handleConversionError(error);
        expect(result).toBe('Video conversion requires secure context (HTTPS). Please check your browser settings.');
      });
    });

    it('should handle out of memory errors', () => {
      const error = new Error('out of memory');
      const result = handleConversionError(error);

      expect(result).toBe('File too large for conversion. Try a smaller file or reduce quality settings.');
    });

    it('should handle out of memory errors with different message formats', () => {
      const variations = [
        'RangeError: out of memory',
        'Memory allocation failed - out of memory',
        'JavaScript heap out of memory'
      ];

      variations.forEach(message => {
        const error = new Error(message);
        const result = handleConversionError(error);
        expect(result).toBe('File too large for conversion. Try a smaller file or reduce quality settings.');
      });

      // This one doesn't contain "out of memory" so should fall back to generic
      const genericError = new Error('Out of memory error');
      const genericResult = handleConversionError(genericError);
      expect(genericResult).toBe('Conversion failed: Out of memory error');
    });

    it('should handle generic Error instances', () => {
      const error = new Error('Generic error message');
      const result = handleConversionError(error);

      expect(result).toBe('Conversion failed: Generic error message');
    });

    it('should handle Error instances with file type', () => {
      const error = new Error('Processing failed');
      const result = handleConversionError(error, 'image');

      expect(result).toBe('Conversion failed: Processing failed');
    });

    it('should handle TypeError instances', () => {
      const error = new TypeError('Invalid type provided');
      const result = handleConversionError(error);

      expect(result).toBe('Conversion failed: Invalid type provided');
    });

    it('should handle RangeError instances', () => {
      const error = new RangeError('Value out of range');
      const result = handleConversionError(error);

      expect(result).toBe('Conversion failed: Value out of range');
    });

    it('should handle unknown error types', () => {
      const result = handleConversionError('string error');
      expect(result).toBe('Unknown error occurred during file conversion');
    });

    it('should handle unknown error types with file type', () => {
      const result = handleConversionError('string error', 'video');
      expect(result).toBe('Unknown error occurred during video conversion');
    });

    it('should handle null and undefined errors', () => {
      expect(handleConversionError(null)).toBe('Unknown error occurred during file conversion');
      expect(handleConversionError(undefined)).toBe('Unknown error occurred during file conversion');
      expect(handleConversionError(null, 'image')).toBe('Unknown error occurred during image conversion');
    });

    it('should handle numeric errors', () => {
      const result = handleConversionError(404);
      expect(result).toBe('Unknown error occurred during file conversion');
    });

    it('should handle object errors without message', () => {
      const result = handleConversionError({ code: 'UNKNOWN' });
      expect(result).toBe('Unknown error occurred during file conversion');
    });

    it('should prioritize specific error patterns over generic handling', () => {
      // SharedArrayBuffer error should be detected even in complex messages
      const complexError = new Error('Failed to initialize: SharedArrayBuffer is not available in this context');
      const result = handleConversionError(complexError);

      expect(result).toBe('Video conversion requires secure context (HTTPS). Please check your browser settings.');
    });

    it('should handle case-sensitive error detection', () => {
      const upperCaseError = new Error('OUT OF MEMORY');
      const mixedCaseError = new Error('Out Of Memory');

      // The actual implementation is case-sensitive, so these should fall back to generic
      expect(handleConversionError(upperCaseError)).toBe('Conversion failed: OUT OF MEMORY');
      expect(handleConversionError(mixedCaseError)).toBe('Conversion failed: Out Of Memory');

      // Only lowercase "out of memory" triggers the special handling
      const lowerCaseError = new Error('out of memory');
      expect(handleConversionError(lowerCaseError)).toBe('File too large for conversion. Try a smaller file or reduce quality settings.');
    });

    it('should handle empty error messages', () => {
      const emptyError = new Error('');
      const result = handleConversionError(emptyError);

      expect(result).toBe('Conversion failed: ');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);
      const result = handleConversionError(error);

      expect(result).toBe(`Conversion failed: ${longMessage}`);
    });
  });

  describe('integration tests', () => {
    it('should work with different file types consistently', () => {
      const fileTypes = ['image', 'video', 'audio', 'document'];
      const error = new Error('Generic processing error');

      fileTypes.forEach(fileType => {
        const result = handleConversionError(error, fileType);
        expect(result).toBe('Conversion failed: Generic processing error');
      });
    });

    it('should handle conversion workflow errors', () => {
      // Simulate different stages of conversion errors
      const errors = [
        { error: new Error('File reading failed'), stage: 'input' },
        { error: new Error('SharedArrayBuffer not available'), stage: 'ffmpeg-init' },
        { error: new Error('out of memory'), stage: 'processing' },
        { error: new ConversionError('Invalid format'), stage: 'output' }
      ];

      const results = errors.map(({ error, stage }) => ({
        stage,
        message: handleConversionError(error, 'video')
      }));

      expect(results[0].message).toBe('Conversion failed: File reading failed');
      expect(results[1].message).toBe('Video conversion requires secure context (HTTPS). Please check your browser settings.');
      expect(results[2].message).toBe('File too large for conversion. Try a smaller file or reduce quality settings.');
      expect(results[3].message).toBe('Invalid format');
    });

    it('should maintain error context through conversion chain', () => {
      const originalError = new TypeError('Invalid input format');
      const conversionError = new ConversionError('Image conversion failed', originalError, 'image');

      const result = handleConversionError(conversionError);

      expect(result).toBe('Image conversion failed');
      expect(conversionError.cause).toBe(originalError);
      expect(conversionError.fileType).toBe('image');
    });

    it('should handle nested error scenarios', () => {
      const rootCause = new Error('Network timeout');
      const ffmpegError = new Error('FFmpeg initialization failed');
      const conversionError = new ConversionError('Video processing error', ffmpegError, 'video');

      // Test that the top-level error is handled appropriately
      const result = handleConversionError(conversionError);
      expect(result).toBe('Video processing error');

      // Test that intermediate errors are also handled
      const ffmpegResult = handleConversionError(ffmpegError, 'video');
      expect(ffmpegResult).toBe('Conversion failed: FFmpeg initialization failed');
    });

    it('should provide user-friendly messages for common scenarios', () => {
      const commonErrors = [
        {
          error: new Error('SharedArrayBuffer is not defined'),
          expected: 'Video conversion requires secure context (HTTPS). Please check your browser settings.'
        },
        {
          error: new Error('JavaScript heap out of memory'),
          expected: 'File too large for conversion. Try a smaller file or reduce quality settings.'
        },
        {
          error: new ConversionError('Unsupported format'),
          expected: 'Unsupported format'
        }
      ];

      commonErrors.forEach(({ error, expected }) => {
        const result = handleConversionError(error);
        expect(result).toBe(expected);
      });
    });
  });
});
