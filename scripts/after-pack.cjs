// node-pty's prebuilt spawn-helper ships without the exec bit, which fails spawns with
// "posix_spawnp failed". electron-builder has no per-file mode option, so chmod +x every
// spawn-helper under the unpacked tree after packing (covers prebuilds/<arch> and build/Release).
const fs = require('fs');
const path = require('path');

function findFiles(root, predicate, out = []) {
	if (!fs.existsSync(root)) return out;
	for (const name of fs.readdirSync(root)) {
		const p = path.join(root, name);
		let st;
		try {
			st = fs.statSync(p);
		} catch {
			continue;
		}
		if (st.isDirectory()) findFiles(p, predicate, out);
		else if (predicate(p)) out.push(p);
	}
	return out;
}

exports.default = async function afterPack(context) {
	const { appOutDir, electronPlatformName, packager } = context;
	const resources =
		electronPlatformName === 'darwin'
			? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
			: path.join(appOutDir, 'resources');
	const unpacked = path.join(resources, 'app.asar.unpacked');

	const helpers = findFiles(unpacked, (p) => path.basename(p) === 'spawn-helper');
	for (const p of helpers) {
		fs.chmodSync(p, 0o755);
		console.log('after-pack: chmod 755', p);
	}
	if (!helpers.length) console.log('after-pack: no spawn-helper found under', unpacked);
};
