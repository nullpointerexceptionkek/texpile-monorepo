import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Plain Svelte 5 + Vite (no SvelteKit): this file only configures the preprocessor.
// It is read by @sveltejs/vite-plugin-svelte AND imported by eslint.config.js for the
// svelte parser, so keep it even though it looks trivial.
/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	// Consult https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/preprocess.md
	// for more information about preprocessors
	preprocess: vitePreprocess()
};

export default config;
