/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

// Provide small runtime shims for browser tests
import { page } from '@vitest/browser/context';

// Some tests use a Playwright-style helper; provide a minimal equivalent
if (!(page as any).waitForTimeout) {
  (page as any).waitForTimeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
}
