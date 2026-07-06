import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Library package: only `svelte-package` runs here (no app/demo build), so no adapter is needed.
/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess()
};

export default config;
