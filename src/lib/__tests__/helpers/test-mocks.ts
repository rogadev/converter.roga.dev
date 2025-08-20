/**
 * Centralized mock setup for consistent testing across the application
 */
import { vi } from 'vitest';

export interface MockSetupOptions {
  includeWebUtils?: boolean;
  includeConversionService?: boolean;
  includeURLMocks?: boolean;
}

export class TestMocks {
  private static isSetup = false;

  /**
   * Sets up all common mocks used across test files
   */
  static setup(options: MockSetupOptions = {}) {
    const {
      includeWebUtils = true,
      includeConversionService = true,
      includeURLMocks = true
    } = options;

    if (includeConversionService) {
      this.setupConversionServiceMocks();
    }

    if (includeWebUtils) {
      this.setupWebUtilsMocks();
    }

    if (includeURLMocks) {
      this.setupURLMocks();
    }

    this.isSetup = true;
  }

  /**
   * Sets up ConversionService mocks
   */
  static setupConversionServiceMocks() {
    vi.mock('$lib/conversion-service', () => ({
      ConversionService: {
        convertImage: vi.fn(),
        convertVideo: vi.fn()
      }
    }));
  }

  /**
   * Sets up web utilities mocks
   */
  static setupWebUtilsMocks() {
    vi.mock('$lib/converters/web', () => ({
      downloadBlob: vi.fn(),
      humanFileSize: vi.fn((size: number) => `${(size / 1024).toFixed(1)} KB`),
      renameFile: vi.fn((name: string, ext: string) => name.replace(/\.[^/.]+$/, `.${ext}`))
    }));
  }

  /**
   * Sets up URL API mocks for browser environment
   */
  static setupURLMocks() {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  }

  /**
   * Gets mocked conversion service for test assertions
   */
  static async getConversionServiceMocks() {
    const { ConversionService } = await import('$lib/conversion-service');
    return {
      ConversionService: {
        convertImage: ConversionService.convertImage as any,
        convertVideo: ConversionService.convertVideo as any
      }
    };
  }

  /**
   * Gets mocked web utils for test assertions
   */
  static async getWebUtilsMocks() {
    return await import('$lib/converters/web');
  }

  /**
   * Sets up default successful conversion responses
   */
  static async setupSuccessfulConversions() {
    const mockConversionService = await this.getConversionServiceMocks();

    mockConversionService.ConversionService.convertImage.mockResolvedValue({
      blob: new Blob(['converted image'], { type: 'image/png' }),
      filename: 'test.png'
    });

    mockConversionService.ConversionService.convertVideo.mockResolvedValue({
      blob: new Blob(['converted gif'], { type: 'image/gif' }),
      filename: 'test.gif'
    });
  }

  /**
   * Resets all mocks to clean state
   */
  static reset() {
    vi.clearAllMocks();
  }

  /**
   * Restores all mocks
   */
  static restore() {
    vi.restoreAllMocks();
    this.isSetup = false;
  }
}

/**
 * Convenience function for common test setup
 */
export const setupCommonMocks = (options?: MockSetupOptions) => {
  TestMocks.setup(options);
  return TestMocks;
};
