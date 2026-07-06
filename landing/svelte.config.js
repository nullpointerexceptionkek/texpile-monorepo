import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		// Fully static site (single landing page) — deployable to GitHub Pages or any static host.
		adapter: adapter({ fallback: undefined }),
		prerender: { entries: ['*'] }
	}
};

export default config;
