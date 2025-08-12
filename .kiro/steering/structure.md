# Project Structure

## Root Directory
- **Configuration files**: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`
- **Testing configs**: `playwright.config.ts`, `vitest-setup-client.ts`
- **Package management**: `.npmrc`, `pnpm-lock.yaml`

## Source Organization (`src/`)

### Core App Files
- `app.html` - HTML template
- `app.css` - Global styles
- `app.d.ts` - TypeScript declarations

### Routes (`src/routes/`)
- SvelteKit file-based routing
- `+layout.svelte` - Layout component
- `+page.svelte` - Home page component
- `page.svelte.test.ts` - Page component tests

### Library (`src/lib/`)
- `index.ts` - Main library exports
- `converters/` - Conversion logic modules
  - `image.ts` - Image conversion utilities
  - `video.ts` - Video conversion utilities  
  - `web.ts` - Web-specific helpers
  - `*.test.ts` - Unit tests for utilities
  - `*.svelte.test.ts` - Component tests

## Testing Structure

### Unit Tests
- **Location**: Alongside source files (`*.test.ts`, `*.svelte.test.ts`)
- **Browser tests**: For Svelte components (`.svelte.test.ts`)
- **Node tests**: For utilities (`.test.ts`)

### E2E Tests
- **Location**: `e2e/` directory
- **Pattern**: `*.test.ts` files using Playwright
- **Example**: `demo.test.ts` - Basic page functionality

## Static Assets
- `static/` - Public assets (favicon, etc.)

## Naming Conventions
- **Files**: kebab-case for routes, camelCase for utilities
- **Tests**: `*.test.ts` for Node, `*.svelte.test.ts` for browser
- **Components**: PascalCase Svelte components
- **Converters**: Organized by media type (image, video, web)
