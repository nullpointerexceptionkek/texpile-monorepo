import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		// Fully static site (single landing page) — deployable to any static host at a domain root.
		adapter: adapter({ fallback: undefined }),
		// '*' crawls real <a href> tags for the locale variants; the Navbar's language switcher is a
		// Menu component (not anchors), so the non-base locales must be listed explicitly or they
		// silently stop being prerendered.
		prerender: {
			entries: ['*', '/zh-Hans', '/zh-Hans/download', '/zh-Hant', '/zh-Hant/download', '/de', '/de/download']
		},
		// absolute asset URLs, so 404.html (served for any missing path) is styled at any URL depth
		paths: { relative: false }
	}
};

export default config;
