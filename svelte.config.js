import adapterAuto from '@sveltejs/adapter-auto'
import adapterVercel from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Use adapter-vercel for production builds, adapter-auto for development
const adapter =
  process.env.NODE_ENV === 'production' ? adapterVercel() : adapterAuto()

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: { adapter },
}

export default config
