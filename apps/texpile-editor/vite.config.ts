import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';
import path from 'node:path';

// pre-bundle every runtime dependency up front: lazy discovery re-optimizes mid-session and
// forces a full page reload (mathlive and the CodeMirror language modes are the usual offenders)
const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version?: string; dependencies?: Record<string, string> };
// __APP_VERSION__ comes from the ROOT package.json, the same field electron-builder stamps
// into the installer, so the two can never drift apart.
const rootPkg = require('../../package.json') as { version?: string };

// build-only packages must not be pre-bundled for the browser
const NO_PREBUNDLE = new Set([
	'harper.js', // ships its own WASM worker; kept external (see optimizeDeps.exclude)
	'svelte-pdf-view', // bundles the PDF.js worker; pre-bundling breaks worker loading (see optimizeDeps.exclude)
	'@tailwindcss/vite' // a Vite plugin, not a runtime dependency
]);

const prebundle = Object.keys(pkg.dependencies ?? {}).filter((d) => !NO_PREBUNDLE.has(d));

export default defineConfig({
	plugins: [tailwindcss(), svelte()],

	// relative asset URLs: the packaged app is served from the app:// scheme (electron/src/main.ts),
	// so the bundle must not assume a server root
	base: './',

	// injected at build time (importing package.json fails Vite's dev fs-allow list)
	define: {
		__APP_VERSION__: JSON.stringify(rootPkg.version ?? '0.0.0')
	},
	test: {
		// unit tests live under tests/unit/ (mirroring src/); playwright's tests/integration/
		// tree is deliberately outside this glob
		include: ['tests/unit/**/*.{test,spec}.{js,ts}']
	},

	resolve: {
		// 90+ source files (and the vitest suite) import through $lib, so keep it as a plain alias
		alias: {
			$lib: path.resolve(__dirname, 'src/lib')
		},
		// dynamically-loaded language packages must share one @codemirror/state instance
		// (avoids instanceof failures)
		dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language']
	},

	optimizeDeps: {
		include: [
			...prebundle,
			// dynamically loaded by @codemirror/language-data's .load(); transitive, so resolve
			// through it with Vite's `a > b` syntax
			'@codemirror/language-data > @codemirror/legacy-modes/mode/stex', // LaTeX highlighting
			'@codemirror/language-data > @codemirror/lang-json'
		],
		exclude: ['harper.js', 'svelte-pdf-view'],
		esbuildOptions: {
			target: 'esnext'
		}
	},

	assetsInclude: ['**/*.wasm'],

	worker: {
		format: 'es'
	},

	build: {
		sourcemap: false
	},

	// minification strips our comments but must keep third-party legal comments (/*! */,
	// @license, @preserve): they're the bundled libraries' attribution requirements
	esbuild: {
		legalComments: 'inline'
	}
});
