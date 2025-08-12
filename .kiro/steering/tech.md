# Technology Stack

## Framework & Build System
- **SvelteKit**: Full-stack web framework with Svelte 5
- **Vite**: Build tool and dev server
- **TypeScript**: Primary language with strict type checking
- **Tailwind CSS 4**: Utility-first CSS framework with Vite plugin
- **Vercel Adapter**: Deployment target

## Core Dependencies
- **FFmpeg WASM**: Video processing (`@ffmpeg/ffmpeg`, `@ffmpeg/core`, `@ffmpeg/util`)
- **Canvas API**: Image processing (browser native)

## Testing
- **Vitest**: Unit testing with browser environment support
- **Playwright**: End-to-end testing
- **Dual test environments**: Browser tests for Svelte components, Node tests for utilities

## Package Management
- **pnpm**: Package manager (see `.npmrc` and `pnpm-lock.yaml`)

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm test             # Run all tests (unit + e2e)
npm run test:unit    # Run unit tests only
npm run test:e2e     # Run end-to-end tests only
```

### Code Quality
```bash
npm run check        # Type checking with svelte-check
npm run check:watch  # Type checking in watch mode
```

## Special Configuration
- **CORS headers**: Required for FFmpeg WASM (`Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`)
- **Vite optimization**: FFmpeg packages excluded from pre-bundling
- **Browser-first**: Optimized for client-side processing
