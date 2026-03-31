# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Client-side file format converter built with SvelteKit 2, Svelte 5 (runes), TypeScript, and Tailwind CSS 4. Converts images (PNG, JPEG, WebP, AVIF, SVG, ICO) and video (MP4 to GIF via FFmpeg WASM). All processing happens in the browser.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm check            # Type-check with svelte-check

pnpm test             # Run all tests (unit + UI + e2e)
pnpm test:unit        # Server-side unit tests (Node, vitest)
pnpm test:ui          # Client/browser tests (Playwright browser, vitest)
pnpm test:e2e         # End-to-end tests (Playwright)

# Run a single test file
pnpm vitest run --project server src/lib/converters/image.test.ts
pnpm vitest run --project client src/routes/page.svelte.test.ts
```

## Architecture

```
+page.svelte (UI state via Svelte 5 runes)
    ↓ uses
Components (FormatSelector, ImageCropper, ResizeOptions, etc.)
    ↓ triggers
ConversionService (orchestrator: routes to correct converter)
    ↓ delegates
Converters:
  - image.ts → Canvas/ImageBitmap API (crop, resize, format conversion)
  - video.ts → FFmpeg WASM (MP4→GIF, lazy-loaded, two-pass high-quality mode)
  - web.ts   → Browser utilities (download, file rename, size formatting)
    ↓ returns
Blob → download or preview
```

**Key design decisions:**

- FFmpeg WASM is dynamically imported on demand to keep the initial bundle small
- Converters are pure functions; ConversionService handles orchestration; UI handles state/presentation
- ICO output wraps a PNG blob with an ICO header
- SVG conversion loads into an Image element before drawing to Canvas
- FFmpeg requires CORS headers (`Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Opener-Policy: same-origin`), configured in vite.config.ts

## Testing

Two Vitest projects configured in vite.config.ts:

- **server** (Node): `src/**/*.test.ts` — tests for converters, services, utilities
- **client** (Playwright browser): `src/**/*.svelte.test.ts` — component/integration tests using `vitest-browser-svelte`

E2E tests use Playwright directly from `e2e/` directory.

Shared test helpers live in `src/lib/__tests__/helpers/` (mock file factory, conversion test harness, UI helpers, global mocks for Canvas/ImageBitmap).

## Svelte 5 Conventions

This project uses Svelte 5 runes exclusively (`$state`, `$derived`, `$props`, `$bindable`). Key rules from the project's code review checklist:

- Prefer `$derived` over `$effect` for computed values
- Avoid `$effect` for side effects that should be event handlers
- Use `{#snippet}` over slots where appropriate

## Deployment

Adapter-based: `adapter-vercel` in production, `adapter-auto` in development (configured in svelte.config.js).
