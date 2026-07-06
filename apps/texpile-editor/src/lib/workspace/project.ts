// multi-file support: pick the main entry .tex and gather macro-defining text from its preamble
// include-chain, so fragments can round-trip custom commands whose signatures live in the main
// file. signature scanning only, never written back to disk.
import { readTextFile, dirname, joinPath, type TexFile } from './fileSystem';

const BEGIN_DOC = /\\begin\s*\{document\}/;

/** strips line comments so a commented-out \begin{document} or \input doesn't count. */
function decomment(s: string): string {
	return s.replace(/(^|[^\\])%[^\n]*/g, '$1');
}

/** everything before \begin{document}; the whole string if there is none. */
function preambleOf(text: string): string {
	const m = BEGIN_DOC.exec(text);
	return m ? text.slice(0, m.index) : text;
}

const normPath = (p: string) => p.replace(/\\/g, '/').toLowerCase();

/** picks the main entry .tex: conventional names first, else the shallowest file with a real \begin{document}. */
export async function detectMainFile(files: TexFile[]): Promise<string | null> {
	if (files.length === 0) return null;
	if (files.length === 1) return files[0].path;

	const FAVOURITES = ['main.tex', 'paper.tex', 'root.tex', 'ms.tex', 'manuscript.tex', 'article.tex', 'thesis.tex'];

	// read every file once, project folders are small
	const scanned = await Promise.all(
		files.map(async (f) => {
			try {
				return { f, hasDoc: BEGIN_DOC.test(decomment(await readTextFile(f.path))) };
			} catch {
				return { f, hasDoc: false };
			}
		})
	);
	const roots = scanned.filter((s) => s.hasDoc).map((s) => s.f);
	if (roots.length === 0) return files[0].path; // no document root, fall back to the first

	for (const fav of FAVOURITES) {
		const hit = roots.find((r) => r.name.toLowerCase() === fav);
		if (hit) return hit.path;
	}
	// shallowest then shortest, for a deterministic choice
	roots.sort((a, b) => a.relPath.split(/[\\/]/).length - b.relPath.split(/[\\/]/).length || a.relPath.length - b.relPath.length);
	return roots[0].path;
}

// macro-bearing refs followed out of a preamble; a standard package won't resolve
// to a project-local file and is skipped
const INCLUDE_RE = /\\(?:input|include|subfile|subfileinclude)\s*\{([^}]+)\}/g;
const PKG_RE = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;

/** resolves a reference against a base dir, trying extensions; the first that reads wins. */
async function resolveRead(baseDir: string, ref: string, exts: string[]): Promise<{ path: string; text: string } | null> {
	const cand = ref.trim().replace(/\\/g, '/');
	if (!cand) return null;
	const tries = /\.[a-z]+$/i.test(cand) ? [cand] : exts.map((e) => cand + e);
	for (const rel of tries) {
		const path = joinPath(baseDir, rel);
		try {
			return { path, text: await readTextFile(path) };
		} catch {
			/* try the next candidate */
		}
	}
	return null;
}

/**
 * Collects macro-defining text reachable from the main file's preamble include-chain, cycle-
 * and depth-guarded. Only the main file is restricted to its preamble (its body-level \input
 * would drag in whole sections); fragments are scanned whole. Over-gathering is harmless,
 * the result feeds signature scanning only.
 */
export async function gatherProjectMacros(mainFilePath: string, root: string): Promise<string> {
	const seen = new Set<string>();
	const chunks: string[] = [];

	async function walk(filePath: string, text: string, depth: number): Promise<void> {
		// fragments have no \begin{document}, so preambleOf returns the whole file
		const scan = preambleOf(text);
		chunks.push(scan);
		if (depth >= 6) return;

		const refs: { ref: string; exts: string[] }[] = [];
		for (const m of scan.matchAll(INCLUDE_RE)) refs.push({ ref: m[1], exts: ['.tex'] });
		for (const m of scan.matchAll(PKG_RE)) for (const name of m[1].split(',')) refs.push({ ref: name, exts: ['.sty', '.cls'] });

		for (const { ref, exts } of refs) {
			// referrer's own dir first, then the project root
			const got = (await resolveRead(dirname(filePath), ref, exts)) ?? (await resolveRead(root, ref, exts));
			if (!got) continue; // standard package or missing file
			const key = normPath(got.path);
			if (seen.has(key)) continue;
			seen.add(key);
			await walk(got.path, got.text, depth + 1);
		}
	}

	try {
		const text = await readTextFile(mainFilePath);
		seen.add(normPath(mainFilePath));
		await walk(mainFilePath, text, 0);
	} catch {
		return ''; // main file unreadable, fall back to per-file preamble scanning
	}
	return chunks.join('\n');
}
