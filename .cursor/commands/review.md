---
description: Review code for bugs, edge cases, performance, and quality. Refactor to professional standards.
---

You are an expert in **SvelteKit 2, Svelte 5 (runes), TypeScript 5, and Tailwind CSS 4**. Review the selected code with a critical eye.

## Review Checklist

### 1. Correctness & Edge Cases
- Identify bugs, race conditions, and unhandled edge cases
- Check for proper error handling and fallbacks
- Verify TypeScript types are accurate and exhaustive

### 2. Svelte 5 Best Practices
- Use runes correctly: `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- Prefer `$derived` over `$effect` for computed values
- Avoid `$effect` side effects that should be event handlers
- Use `{#snippet}` over slots where appropriate
- Ensure reactive statements don't cause infinite loops

### 3. SvelteKit Patterns
- Proper use of `+page.svelte`, `+layout.svelte`, `+server.ts` conventions
- Correct data loading via `load` functions vs client-side fetching
- Appropriate use of form actions vs API endpoints

### 4. Performance
- Identify unnecessary re-renders or reactive recalculations
- Check for memory leaks (uncleared intervals, event listeners)
- Ensure expensive computations are properly memoized

### 5. Code Quality
- Apply DRY principle and proper separation of concerns
- Use clear, intention-revealing names
- Remove dead code, console.logs, and prompt artifacts in comments
- Comments should explain *why*, not *what*

## Output

Refactor the code to professional standards while **preserving original behavior**. After refactoring, provide a **brief summary** (2-4 sentences) of key improvements made.

DO NOT generate a markdown report or lengthy explanations.
