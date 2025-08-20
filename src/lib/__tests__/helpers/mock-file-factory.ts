/**
 * MockFileFactory - Utility for creating test files with various characteristics
 * Used across test suites to generate consistent test data
 */

export interface MockFileOptions {
  size?: number;
  lastModified?: number;
  content?: string | Uint8Array;
}

export interface FileValidationOptions {
  minSize?: number;
  maxSize?: number;
  requiredType?: string;
  requiredExtension?: string;
}

export class MockFileFactory {
  /**
   * Creates a mock image file with specified format and characteristics
   */
  static createImageFile(
    name: string,
    type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif' = 'image/jpeg',
    options: MockFileOptions = {}
  ): File {
    const { size = 1024, lastModified = Date.now(), content } = options;

    // Create realistic image file content or use provided content
    const fileContent = content || this.generateImageContent(type, size);

    return new File([fileContent as BlobPart], name, {
      type,
      lastModified
    });
  }

  /**
   * Creates a mock video file (MP4)
   */
  static createVideoFile(
    name: string = 'test-video.mp4',
    options: MockFileOptions = {}
  ): File {
    const { size = 5 * 1024 * 1024, lastModified = Date.now(), content } = options; // 5MB default

    const fileContent = content || this.generateVideoContent(size);

    return new File([fileContent as BlobPart], name, {
      type: 'video/mp4',
      lastModified
    });
  }

  /**
   * Creates a corrupted file that should trigger error handling
   */
  static createCorruptedFile(
    name: string,
    type: string,
    options: MockFileOptions = {}
  ): File {
    const { size = 100, lastModified = Date.now() } = options;

    // Create invalid content that should cause conversion errors
    const corruptedContent = new Uint8Array(size).fill(0xFF);

    return new File([corruptedContent], name, {
      type,
      lastModified
    });
  }

  /**
   * Creates a large file for performance testing
   */
  static createLargeFile(
    name: string,
    type: string,
    sizeMB: number,
    options: Omit<MockFileOptions, 'size'> = {}
  ): File {
    if (sizeMB <= 0) {
      throw new Error('File size must be greater than 0');
    }
    if (sizeMB > 1000) {
      console.warn(`Creating very large file (${sizeMB}MB). This may cause memory issues.`);
    }

    const { lastModified = Date.now() } = options;
    const size = sizeMB * 1024 * 1024;

    // Generate large content efficiently
    const content = this.generateLargeContent(size);

    return new File([content as BlobPart], name, {
      type,
      lastModified
    });
  }

  /**
   * Creates an unsupported file type for testing error handling
   */
  static createUnsupportedFile(
    name: string = 'test.txt',
    options: MockFileOptions = {}
  ): File {
    const { size = 100, lastModified = Date.now() } = options;
    const content = new TextEncoder().encode('This is an unsupported file type');

    return new File([content], name, {
      type: 'text/plain',
      lastModified
    });
  }

  /**
   * Creates a file with no extension for edge case testing
   */
  static createFileWithoutExtension(
    name: string = 'noextension',
    type: string = 'image/jpeg',
    options: MockFileOptions = {}
  ): File {
    return this.createImageFile(name, type as any, options);
  }

  /**
   * Creates multiple test files for batch testing scenarios
   */
  static createTestFileSet(): {
    smallImage: File;
    largeImage: File;
    video: File;
    corrupted: File;
    unsupported: File;
  } {
    return {
      smallImage: this.createImageFile('small.jpg', 'image/jpeg', { size: 1024 }),
      largeImage: this.createImageFile('large.png', 'image/png', { size: 2 * 1024 * 1024 }),
      video: this.createVideoFile('test.mp4', { size: 10 * 1024 * 1024 }),
      corrupted: this.createCorruptedFile('corrupted.jpg', 'image/jpeg'),
      unsupported: this.createUnsupportedFile('document.txt')
    };
  }

  /**
   * Generates realistic image file content based on format
   */
  private static generateImageContent(type: string, size: number): Uint8Array {
    const content = new Uint8Array(size);

    // Add format-specific headers for more realistic files
    switch (type) {
      case 'image/jpeg':
        // JPEG header: FF D8 FF
        content[0] = 0xFF;
        content[1] = 0xD8;
        content[2] = 0xFF;
        break;
      case 'image/png':
        // PNG header: 89 50 4E 47 0D 0A 1A 0A
        content[0] = 0x89;
        content[1] = 0x50;
        content[2] = 0x4E;
        content[3] = 0x47;
        content[4] = 0x0D;
        content[5] = 0x0A;
        content[6] = 0x1A;
        content[7] = 0x0A;
        break;
      case 'image/webp':
        // WebP header: RIFF....WEBP
        content[0] = 0x52; // R
        content[1] = 0x49; // I
        content[2] = 0x46; // F
        content[3] = 0x46; // F
        content[8] = 0x57; // W
        content[9] = 0x45; // E
        content[10] = 0x42; // B
        content[11] = 0x50; // P
        break;
    }

    // Fill rest with pseudo-random data
    for (let i = 12; i < size; i++) {
      content[i] = Math.floor(Math.random() * 256);
    }

    return content;
  }

  /**
   * Generates realistic video file content
   */
  private static generateVideoContent(size: number): Uint8Array {
    const content = new Uint8Array(size);

    // MP4 header: ftyp
    content[4] = 0x66; // f
    content[5] = 0x74; // t
    content[6] = 0x79; // y
    content[7] = 0x70; // p

    // Fill with pseudo-random data
    for (let i = 8; i < size; i++) {
      content[i] = Math.floor(Math.random() * 256);
    }

    return content;
  }

  /**
   * Validates a file meets certain criteria
   */
  static validateFile(file: File, options: FileValidationOptions = {}): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const { minSize = 0, maxSize = Infinity, requiredType, requiredExtension } = options;

    if (file.size < minSize) {
      errors.push(`File size ${file.size} is below minimum ${minSize}`);
    }

    if (file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum ${maxSize}`);
    }

    if (requiredType && file.type !== requiredType) {
      errors.push(`Expected file type ${requiredType}, got ${file.type}`);
    }

    if (requiredExtension && !file.name.endsWith(requiredExtension)) {
      errors.push(`Expected file extension ${requiredExtension}, got ${file.name}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a file with specific validation requirements
   */
  static createValidatedFile(
    name: string,
    type: string,
    validation: FileValidationOptions,
    options: MockFileOptions = {}
  ): File {
    const { minSize = 1024, maxSize = 10 * 1024 * 1024 } = validation;
    const size = Math.max(minSize, Math.min(maxSize, options.size || minSize));

    const file = new File([this.generateContent(type, size) as BlobPart], name, {
      type,
      lastModified: options.lastModified || Date.now()
    });

    const validationResult = this.validateFile(file, validation);
    if (!validationResult.valid) {
      throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
    }

    return file;
  }

  /**
   * Efficiently generates large content for performance testing
   */
  private static generateLargeContent(size: number): Uint8Array {
    const chunkSize = 64 * 1024; // 64KB chunks
    const content = new Uint8Array(size);

    // Generate a pattern and repeat it
    const pattern = new Uint8Array(chunkSize);
    for (let i = 0; i < chunkSize; i++) {
      pattern[i] = i % 256;
    }

    // Fill the large array with the pattern
    for (let offset = 0; offset < size; offset += chunkSize) {
      const remainingSize = Math.min(chunkSize, size - offset);
      content.set(pattern.subarray(0, remainingSize), offset);
    }

    return content;
  }

  /**
   * Generates content based on file type
   */
  private static generateContent(type: string, size: number): Uint8Array {
    if (type.startsWith('image/')) {
      return this.generateImageContent(type, size);
    } else if (type.startsWith('video/')) {
      return this.generateVideoContent(size);
    } else {
      return this.generateLargeContent(size);
    }
  }
}

/**
 * Convenience functions for common test scenarios
 */
export const TestFiles = {
  // Common image formats
  jpegImage: () => MockFileFactory.createImageFile('test.jpg', 'image/jpeg'),
  pngImage: () => MockFileFactory.createImageFile('test.png', 'image/png'),
  webpImage: () => MockFileFactory.createImageFile('test.webp', 'image/webp'),
  avifImage: () => MockFileFactory.createImageFile('test.avif', 'image/avif'),

  // Video files
  mp4Video: () => MockFileFactory.createVideoFile('test.mp4'),

  // Edge cases
  corruptedImage: () => MockFileFactory.createCorruptedFile('corrupted.jpg', 'image/jpeg'),
  unsupportedFile: () => MockFileFactory.createUnsupportedFile('document.txt'),
  largeImage: () => MockFileFactory.createLargeFile('large.jpg', 'image/jpeg', 50), // 50MB

  // Batch sets
  testSet: () => MockFileFactory.createTestFileSet()
};
