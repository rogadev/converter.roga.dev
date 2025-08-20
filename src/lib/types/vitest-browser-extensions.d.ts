// Type extensions for Vitest browser testing compatibility
declare module '@vitest/browser/context' {
  interface BrowserPage {
    waitForTimeout(ms: number): Promise<void>;
  }
}

// Global extensions
declare global {
  interface Window {
    createImageBitmap?: (blob: Blob) => Promise<{ width: number; height: number; }>;
    OffscreenCanvas?: any;
  }
}

export { };
