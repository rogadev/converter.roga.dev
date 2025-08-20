/**
 * ConversionTestHarness - Utility for standardized conversion testing workflows
 * Provides consistent setup, execution, and validation for conversion operations
 */

import type { ImageConvertOptions } from '../../converters/image';
import type { Mp4ToGifOptions } from '../../converters/video';
import type { ConversionResult } from '../../conversion-service';

export interface PerformanceMetrics {
  executionTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryPeak: number;
  memoryDelta: number;
}

export interface ConversionTestResult {
  success: boolean;
  result?: ConversionResult;
  error?: Error;
  metrics: PerformanceMetrics;
}

export class ConversionTestHarness {
  private static memoryMonitoringEnabled = typeof performance !== 'undefined' && 'memory' in performance;

  /**
   * Sets up and executes an image conversion with performance monitoring
   */
  static async setupImageConversion(
    file: File,
    options: ImageConvertOptions
  ): Promise<ConversionTestResult> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    let memoryPeak = memoryBefore;

    // Monitor memory during conversion
    const memoryMonitor = this.startMemoryMonitoring((usage) => {
      memoryPeak = Math.max(memoryPeak, usage);
    });

    try {
      // Dynamic import to avoid loading in Node.js tests
      const { convertImageFile } = await import('../../converters/image');
      const blob = await convertImageFile(file, options);

      const result: ConversionResult = {
        blob,
        filename: this.generateOutputFilename(file.name, options.targetFormat)
      };

      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      return {
        success: true,
        result,
        metrics: {
          executionTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryPeak,
          memoryDelta: memoryAfter - memoryBefore
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      return {
        success: false,
        error: error as Error,
        metrics: {
          executionTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryPeak,
          memoryDelta: memoryAfter - memoryBefore
        }
      };
    } finally {
      this.stopMemoryMonitoring(memoryMonitor);
    }
  }

  /**
   * Sets up and executes a video conversion with performance monitoring
   */
  static async setupVideoConversion(
    file: File,
    options: Mp4ToGifOptions = {}
  ): Promise<ConversionTestResult> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    let memoryPeak = memoryBefore;

    const memoryMonitor = this.startMemoryMonitoring((usage) => {
      memoryPeak = Math.max(memoryPeak, usage);
    });

    try {
      // Dynamic import to avoid loading FFmpeg in Node.js tests
      const { convertMp4ToGif } = await import('../../converters/video');
      const blob = await convertMp4ToGif(file, options);

      const result: ConversionResult = {
        blob,
        filename: this.generateOutputFilename(file.name, 'gif')
      };

      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      return {
        success: true,
        result,
        metrics: {
          executionTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryPeak,
          memoryDelta: memoryAfter - memoryBefore
        }
      };
    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      return {
        success: false,
        error: error as Error,
        metrics: {
          executionTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryPeak,
          memoryDelta: memoryAfter - memoryBefore
        }
      };
    } finally {
      this.stopMemoryMonitoring(memoryMonitor);
    }
  }

  /**
   * Validates conversion output against expected criteria
   */
  static validateOutput(
    result: ConversionResult,
    expectedType: string,
    expectedMinSize = 0,
    expectedMaxSize = Infinity
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate blob type
    if (result.blob.type !== expectedType) {
      errors.push(`Expected blob type ${expectedType}, got ${result.blob.type}`);
    }

    // Validate blob size
    if (result.blob.size < expectedMinSize) {
      errors.push(`Blob size ${result.blob.size} is below minimum ${expectedMinSize}`);
    }
    if (result.blob.size > expectedMaxSize) {
      errors.push(`Blob size ${result.blob.size} exceeds maximum ${expectedMaxSize}`);
    }

    // Validate filename
    if (!result.filename || result.filename.length === 0) {
      errors.push('Filename is empty or undefined');
    }

    // Validate filename extension matches expected type
    const expectedExtension = this.getExtensionFromMimeType(expectedType);
    if (expectedExtension && !result.filename.endsWith(`.${expectedExtension}`)) {
      errors.push(`Filename ${result.filename} doesn't end with expected extension .${expectedExtension}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Measures performance of any async operation
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    label = 'Operation'
  ): Promise<{ result: T; metrics: PerformanceMetrics; }> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    let memoryPeak = memoryBefore;

    const memoryMonitor = this.startMemoryMonitoring((usage) => {
      memoryPeak = Math.max(memoryPeak, usage);
    });

    try {
      const result = await operation();
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      console.log(`${label} completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`Memory: ${memoryBefore.toFixed(2)}MB -> ${memoryAfter.toFixed(2)}MB (peak: ${memoryPeak.toFixed(2)}MB)`);

      return {
        result,
        metrics: {
          executionTime: endTime - startTime,
          memoryBefore,
          memoryAfter,
          memoryPeak,
          memoryDelta: memoryAfter - memoryBefore
        }
      };
    } finally {
      this.stopMemoryMonitoring(memoryMonitor);
    }
  }

  /**
   * Creates a test blob for validation testing
   */
  static createTestBlob(content: string, type: string): Blob {
    return new Blob([content], { type });
  }

  /**
   * Validates that a blob can be converted to object URL and back
   */
  static async validateBlobIntegrity(blob: Blob): Promise<boolean> {
    try {
      const url = URL.createObjectURL(blob);
      const response = await fetch(url);
      const retrievedBlob = await response.blob();
      URL.revokeObjectURL(url);

      return retrievedBlob.size === blob.size && retrievedBlob.type === blob.type;
    } catch {
      return false;
    }
  }

  /**
   * Gets current memory usage (browser only)
   */
  private static getMemoryUsage(): number {
    if (this.memoryMonitoringEnabled && 'memory' in performance) {
      try {
        const memory = (performance as any).memory as {
          usedJSHeapSize?: number;
          totalJSHeapSize?: number;
          jsHeapSizeLimit?: number;
        } | undefined;
        const usedMB = (memory?.usedJSHeapSize || 0) / (1024 * 1024);
        const totalMB = (memory?.totalJSHeapSize || 0) / (1024 * 1024);
        const limitMB = (memory?.jsHeapSizeLimit || 0) / (1024 * 1024);

        // Log warning if memory usage is high
        if (usedMB > limitMB * 0.8) {
          console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
        }

        return usedMB;
      } catch (error) {
        console.warn('Failed to get memory usage:', error);
        return 0;
      }
    }
    return 0;
  }

  /**
   * Checks if memory usage is within acceptable limits
   */
  private static isMemoryUsageAcceptable(metrics: PerformanceMetrics): {
    acceptable: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for memory leaks (significant increase without cleanup)
    if (metrics.memoryDelta > 50) { // 50MB increase
      warnings.push(`Potential memory leak detected: ${metrics.memoryDelta.toFixed(2)}MB increase`);
    }

    // Check for excessive peak usage
    if (metrics.memoryPeak > 500) { // 500MB peak
      warnings.push(`High peak memory usage: ${metrics.memoryPeak.toFixed(2)}MB`);
    }

    // Check for slow execution (might indicate memory pressure)
    if (metrics.executionTime > 30000) { // 30 seconds
      warnings.push(`Slow execution time: ${metrics.executionTime.toFixed(2)}ms`);
    }

    return {
      acceptable: warnings.length === 0,
      warnings
    };
  }

  /**
   * Starts memory monitoring with callback
   */
  private static startMemoryMonitoring(callback: (usage: number) => void): number | null {
    if (!this.memoryMonitoringEnabled) return null;

    return window.setInterval(() => {
      callback(this.getMemoryUsage());
    }, 100); // Monitor every 100ms
  }

  /**
   * Stops memory monitoring
   */
  private static stopMemoryMonitoring(intervalId: number | null): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  }

  /**
   * Generates output filename based on input and target format
   */
  private static generateOutputFilename(inputName: string, targetFormat: string): string {
    const baseName = inputName.replace(/\.[^/.]+$/, '');
    return `${baseName}.${targetFormat}`;
  }

  /**
   * Gets file extension from MIME type
   */
  private static getExtensionFromMimeType(mimeType: string): string | null {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'image/gif': 'gif'
    };

    return mimeToExt[mimeType] || null;
  }
}

/**
 * Convenience functions for common test scenarios
 */
export const TestHarness = {
  /**
   * Quick image conversion test
   */
  convertImage: (file: File, targetFormat: 'png' | 'jpeg' | 'webp' | 'avif', quality = 0.9) =>
    ConversionTestHarness.setupImageConversion(file, { targetFormat, quality }),

  /**
   * Quick video conversion test
   */
  convertVideo: (file: File, options: Mp4ToGifOptions = {}) =>
    ConversionTestHarness.setupVideoConversion(file, options),

  /**
   * Performance test wrapper
   */
  benchmark: <T>(operation: () => Promise<T>, label?: string) =>
    ConversionTestHarness.measurePerformance(operation, label),

  /**
   * Validate conversion result
   */
  validate: (result: ConversionResult, expectedType: string) =>
    ConversionTestHarness.validateOutput(result, expectedType)
};
