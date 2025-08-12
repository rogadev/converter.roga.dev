/**
 * Node.js Test Helpers - Utilities that work in Node.js environment only
 * These helpers don't import browser-specific APIs
 */

export { MockFileFactory, TestFiles } from './mock-file-factory';
export { ConversionTestHarness, TestHarness } from './conversion-test-harness';

// Re-export only the parts that work in Node.js
export const NodeTestHelpers = {
  createMockFile: (name: string, type: string, size = 100) => {
    return new File([new Uint8Array(size)], name, { type });
  },

  createTestBlob: (content: string, type: string) => {
    return new Blob([content], { type });
  }
};
