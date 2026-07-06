// bundles the Electron main process into two minified files, main.js and preload.js
// (preload must stay its own file: Electron loads it by path). tsc handles type-checking.
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSync } from 'esbuild';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'electron', 'dist');

// stale per-file tsc output must not linger next to the bundle
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

buildSync({
	entryPoints: [join(ROOT, 'electron', 'src', 'main.ts'), join(ROOT, 'electron', 'src', 'preload.ts')],
	outdir: DIST,
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'es2022',
	minify: true,
	// keep third-party @license/@preserve comments; ordinary comments are stripped
	legalComments: 'inline',
	sourcemap: false,
	// node-pty is native, dlopen'd from asar.unpacked at runtime; simple-git is pure JS and bundles in
	external: ['electron', 'node-pty']
});
console.log('build-electron: bundled + minified main.js and preload.js');
