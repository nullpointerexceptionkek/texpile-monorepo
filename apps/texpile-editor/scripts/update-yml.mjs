// Rewrite the bare artifact filenames inside electron-builder's latest*.yml into the immutable
// dl.texpile.com paths (https://dl.texpile.com/v<version>/<file>). The feed lives on
// updates.texpile.com but the binaries and blockmaps stay on dl.texpile.com; electron-updater
// accepts absolute urls and derives <url>.blockmap (and the old version's blockmap by version
// substitution, which the v<version>/ prefix satisfies). Line-based on purpose: no yaml dep at
// the repo root, and the files' shape is fixed.
//   node apps/texpile-editor/scripts/update-yml.mjs release/latest.yml [more.yml ...]
import fs from 'node:fs';

export function rewriteYml(text) {
	const vm = text.match(/^version:\s*(\S+)\s*$/m);
	if (!vm) throw new Error('update-yml: no version line found');
	const base = `https://dl.texpile.com/v${vm[1]}/`;
	const abs = (name) => (/^https?:/.test(name) ? name : base + name);
	return text
		.replace(/^(\s*-\s+url:\s+)(\S+)\s*$/gm, (_, prefix, name) => prefix + abs(name))
		.replace(/^(path:\s+)(\S+)\s*$/m, (_, prefix, name) => prefix + abs(name));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
	const files = process.argv.slice(2);
	if (!files.length) {
		console.error('usage: node update-yml.mjs <latest.yml> [...]');
		process.exit(1);
	}
	for (const f of files) {
		fs.writeFileSync(f, rewriteYml(fs.readFileSync(f, 'utf8')));
		console.log(`update-yml: rewrote ${f}`);
	}
}
