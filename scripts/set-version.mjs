// keeps the app version in lockstep across the root and editor package.json (electron-builder
// stamps it into installers, Vite injects it as __APP_VERSION__). Independent workspace
// packages keep their own semver.
//
// Usage:
//   node scripts/set-version.mjs 0.9.1   set the app version everywhere
//   node scripts/set-version.mjs         sync the others to the root's current version
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const arg = process.argv[2];
const version = arg ?? rootPkg.version;
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
	console.error(`Invalid version "${version}". Expected e.g. 1.2.3 or 1.2.3-beta.1`);
	process.exit(1);
}

// app-version files only; never add the independent libraries here
const targets = ['package.json', 'apps/texpile-editor/package.json'];

let changed = 0;
for (const rel of targets) {
	const p = path.join(root, rel);
	const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
	if (pkg.version === version) {
		console.log(`= ${rel} already ${version}`);
		continue;
	}
	pkg.version = version;
	fs.writeFileSync(p, JSON.stringify(pkg, null, '\t') + '\n');
	console.log(`✓ ${rel} -> ${version}`);
	changed++;
}
console.log(changed ? `\nApp version is now ${version}. Commit and tag v${version} to release.` : `\nAll in sync at ${version}.`);
