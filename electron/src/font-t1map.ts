// Resolve a TFM font name to its Type1 source. The engine's own map file (pdftex.map)
// names the .pfb and the reencoding .enc per font -- the same pair the real PDF embeds.
// Attached to font records as `t1`; the renderer parses the actual font and draws its
// actual outlines (apps/texpile-editor/src/lib/draft/type1). No tables, no substitution.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';

/* eslint-disable @typescript-eslint/no-explicit-any */

const kpseCache = new Map<string, string | null>();
function kpsewhich(file: string): string | null {
	if (kpseCache.has(file)) return kpseCache.get(file)!;
	let p: string | null = null;
	try {
		p = execFileSync('kpsewhich', [file], { timeout: 15000 }).toString().trim().replace(/\\/g, '/') || null;
	} catch {
		p = null;
	}
	kpseCache.set(file, p);
	return p;
}

type MapEntry = { pfb: string; enc?: string };
let mapIndex: Map<string, MapEntry> | null | undefined; // undefined = not loaded; null = unavailable
function loadMap(): Map<string, MapEntry> | null {
	if (mapIndex !== undefined) return mapIndex;
	mapIndex = null;
	const p = kpsewhich('pdftex.map');
	if (p) {
		try {
			const idx = new Map<string, MapEntry>();
			for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
				if (!line || line.startsWith('%') || line.startsWith('#')) continue;
				const toks = line.trim().split(/\s+/);
				let pfb: string | undefined, enc: string | undefined;
				for (const t of toks) {
					if (t[0] !== '<') continue;
					const f = t.replace(/^<+\[?/, ''); // <file, <<file, <[file
					if (f.endsWith('.enc')) enc = f;
					else if (f.endsWith('.pfb')) pfb = f;
				}
				if (pfb) idx.set(toks[0], { pfb, enc });
			}
			mapIndex = idx;
		} catch {
			/* leave null */
		}
	}
	return mapIndex;
}

const DRAWABLE = /\.(otf|ttf)$/i;

/** Adds `t1` ({ pfb, enc } abs paths) to a font record the renderer can't parse directly. */
export function resolveType1(rec: any): void {
	if (!rec || rec.t !== 'font') return;
	if (rec.file && DRAWABLE.test(rec.file)) return;
	const name = String(rec.name || '');
	if (!name) return;
	const e = loadMap()?.get(name);
	if (!e) return;
	const pfb = kpsewhich(e.pfb);
	if (!pfb) return;
	rec.t1 = { pfb, enc: e.enc ? kpsewhich(e.enc) : null };
}

/** Line-wise variant for the page-record strings the compile service returns. */
export function resolveType1Line(line: string): string {
	if (!line.startsWith('{"t":"font"')) return line;
	try {
		const rec = JSON.parse(line);
		resolveType1(rec);
		return rec.t1 ? JSON.stringify(rec) : line;
	} catch {
		return line;
	}
}
