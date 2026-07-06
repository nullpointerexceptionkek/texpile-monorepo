/**
 * Tool, not a real test: round-trips every .tex in a directory through the actual
 * parse -> serialize pipeline (other files copied verbatim) into a parallel directory, for
 * PDF-pixel-comparing a compiled original paper against its round-tripped twin.
 * Inert unless RT_IN is set.
 *
 *   RT_IN=/path/to/paper RT_OUT=/path/to/paper_rt [RT_SKIP='macros|common'] [RT_MODE=deterministic] \
 *     pnpm --filter texpile-editor exec vitest run dirroundtrip.tool
 *
 * RT_SKIP (regex on basename): copy matching .tex verbatim instead of round-tripping.
 * RT_MODE: 'verbatim' (default) is the real app path, untouched blocks re-emit their `orig`
 * slice. 'deterministic' strips `orig`/`docTail` before serializing, forcing every block
 * through the deterministic rules: this is what proves the regeneration path itself.
 *
 * Cross-file macros mirror the real app: one gatherProjectMacros call per paper root (via the
 * detected main file's include-chain), applied to every .tex file in that paper.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Node } from 'prosemirror-model';
import { Fragment } from 'prosemirror-model';

// project.ts's fileSystem import does real network fetches, unusable under vitest. swap in a
// real-fs shim so detectMainFile/gatherProjectMacros run their actual logic against the paper
// directory on disk (project.test.ts does the same with an in-memory shim).
vi.mock('$lib/workspace/fileSystem', () => ({
	readTextFile: async (p: string): Promise<string> => fs.readFileSync(p, 'utf8'),
	dirname: (p: string): string => path.dirname(p).replace(/\\/g, '/'),
	joinPath: (dir: string, rel: string): string => path.join(dir, rel).replace(/\\/g, '/')
}));

const { parseLatexFile, serializeLatexFile } = await import('$lib/workspace/latexRoundtrip');
const { detectMainFile, gatherProjectMacros } = await import('$lib/workspace/project');

const RT_IN = process.env.RT_IN;
const RT_OUT = process.env.RT_OUT;
const RT_SKIP = process.env.RT_SKIP ? new RegExp(process.env.RT_SKIP) : null;
const RT_MODE = process.env.RT_MODE === 'deterministic' ? 'deterministic' : 'verbatim';
// RT_PAIRS processes several papers in one vitest run: "in1::out1::skip1||in2::out2::skip2"
// (skip is an optional basename regex). avoids paying vitest's startup per paper.
const RT_PAIRS = process.env.RT_PAIRS;

function walk(dir: string, base = dir): string[] {
	const out: string[] = [];
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) out.push(...walk(full, base));
		else if (e.isFile()) out.push(path.relative(base, full));
	}
	return out;
}

/** strip every `orig`/`docTail` stamp so the doc serializes through the deterministic rules only */
function stripOrig(doc: Node): Node {
	const kids: Node[] = [];
	for (let i = 0; i < doc.childCount; i++) {
		const child = doc.child(i);
		if ((child.attrs as { orig?: unknown }).orig != null) {
			kids.push(child.type.create({ ...child.attrs, orig: null }, child.content, child.marks));
		} else {
			kids.push(child);
		}
	}
	return doc.type.create({ ...doc.attrs, docTail: null }, Fragment.fromArray(kids), doc.marks);
}

async function roundtripDir(inDir: string, outDir: string, skip: RegExp | null): Promise<void> {
	let tex = 0;
	let copied = 0;
	let skipped = 0;
	let crashed = 0;
	const rels = walk(inDir);
	const texFiles = rels
		.filter((rel) => rel.endsWith('.tex') && !(skip && skip.test(path.basename(rel))))
		.map((rel) => ({ name: path.basename(rel), path: path.join(inDir, rel), relPath: rel }));

	let macros = '';
	try {
		const mainPath = texFiles.length > 0 ? await detectMainFile(texFiles) : null;
		if (mainPath) macros = await gatherProjectMacros(mainPath, inDir);
	} catch (e) {
		console.error(`  ! macro gathering failed for ${inDir}: ${(e as Error).message}`);
	}

	for (const rel of rels) {
		const src = path.join(inDir, rel);
		const dst = path.join(outDir, rel);
		fs.mkdirSync(path.dirname(dst), { recursive: true });
		if (rel.endsWith('.tex') && !(skip && skip.test(path.basename(rel)))) {
			try {
				const text = fs.readFileSync(src, 'utf8');
				const parsed = parseLatexFile(text, macros);
				const doc = RT_MODE === 'deterministic' ? stripOrig(parsed.doc) : parsed.doc;
				fs.writeFileSync(dst, serializeLatexFile(parsed, doc));
				tex++;
			} catch (e) {
				// non-fatal: leave a crash marker so the compile step's report sees which file
				// crashed, instead of losing the whole batch to one bad file
				fs.writeFileSync(dst, fs.readFileSync(src, 'utf8'));
				fs.writeFileSync(dst + '.rt-crash.txt', String((e as Error).stack ?? e));
				console.error(`  ! regen crashed on ${rel}: ${(e as Error).message}`);
				crashed++;
			}
		} else {
			fs.copyFileSync(src, dst);
			if (rel.endsWith('.tex')) skipped++;
			else copied++;
		}
	}
	console.log(
		`round-tripped ${tex} .tex (${RT_MODE}), copied ${copied} other, verbatim(skip) ${skipped} .tex, crashed ${crashed} -> ${outDir}`
	);
}

describe('dir round-tripper', () => {
	const pairs: Array<[string, string, RegExp | null]> = [];
	if (RT_PAIRS) {
		for (const chunk of RT_PAIRS.split('||')) {
			const [i, o, s] = chunk.split('::');
			if (i && o) pairs.push([i, o, s ? new RegExp(s) : null]);
		}
	} else if (RT_IN && RT_OUT) {
		pairs.push([RT_IN, RT_OUT, RT_SKIP]);
	}

	if (pairs.length === 0) {
		it('skipped — set RT_IN/RT_OUT or RT_PAIRS', () => expect(true).toBe(true));
		return;
	}
	it('round-trips every .tex, copies the rest', async () => {
		console.log('');
		for (const [i, o, s] of pairs) await roundtripDir(i, o, s);
		expect(pairs.length).toBeGreaterThan(0);
	});
});
