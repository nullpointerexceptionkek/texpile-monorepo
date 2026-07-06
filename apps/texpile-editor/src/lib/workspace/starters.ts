// starter templates: real .tex/.bib files under ./starters/<id>/, bundled as raw strings at
// build time; to change a starter, edit those files. the canonical package set is the article
// starter's preamble; apa tailors its own because the apa7 class preloads packages that clash
// when re-loaded with different options. only bundle content we can freely redistribute
// (no IEEEtran.cls and friends).
import { joinPath, writeTextFile, statFile } from './fileSystem';

// keys look like "./starters/mla/main.tex"; vite inlines the contents eagerly as strings
const RAW = import.meta.glob('./starters/*/*.{tex,bib}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export interface Starter {
	id: string;
	name: string;
	description: string;
	/** the file the editor opens after the starter is applied. */
	mainFile: string;
	/** relative path -> file contents, written verbatim into the folder. */
	files: Record<string, string>;
}

/** gathers the bundled files for a starter id. */
function filesFor(id: string): Record<string, string> {
	const prefix = `./starters/${id}/`;
	const out: Record<string, string> = {};
	for (const [key, content] of Object.entries(RAW)) {
		if (key.startsWith(prefix)) out[key.slice(prefix.length)] = content;
	}
	return out;
}

export const STARTERS: Starter[] = [
	{
		id: 'article',
		name: 'Basic article',
		description: 'A clean article with a title and sections. Good for notes, homework, or a short paper.',
		mainFile: 'main.tex',
		files: filesFor('article')
	},
	{
		id: 'mla',
		name: 'MLA essay',
		description: 'MLA essay format: Times New Roman, double spacing, a running header, and a Works Cited list.',
		mainFile: 'main.tex',
		files: filesFor('mla')
	},
	{
		id: 'apa',
		name: 'APA paper',
		description: 'APA 7th student paper (apa7 class): title page fields, an abstract, and an APA reference list.',
		mainFile: 'main.tex',
		files: filesFor('apa')
	}
];

export function starterById(id: string): Starter | undefined {
	return STARTERS.find((s) => s.id === id);
}

/** a text file chosen through the "Import your own" starter card. */
export interface ImportedFile {
	name: string;
	content: string;
}

/** picks the file to open: the first .tex with \begin{document}, else the first .tex, else null. */
export function pickImportMain(files: ImportedFile[]): string | null {
	const tex = files.filter((f) => f.name.toLowerCase().endsWith('.tex'));
	return tex.find((f) => f.content.includes('\\begin{document}'))?.name ?? tex[0]?.name ?? null;
}

/** writes imported files into root (never overwriting) and returns the path to open, or null with no .tex. */
export async function applyImportedFiles(root: string, files: ImportedFile[]): Promise<string | null> {
	for (const f of files) {
		const path = joinPath(root, f.name);
		if ((await statFile(path)).exists) continue; // keep the user's existing file
		await writeTextFile(path, f.content);
	}
	const main = pickImportMain(files);
	return main ? joinPath(root, main) : null;
}

/**
 * Writes a starter's files into root and returns its main file path. Existing files are never
 * overwritten: the folder may already hold the user's own data (a references.bib, say).
 */
export async function applyStarter(root: string, starter: Starter): Promise<string> {
	for (const [rel, content] of Object.entries(starter.files)) {
		const path = joinPath(root, rel);
		if ((await statFile(path)).exists) continue; // keep the user's existing file
		await writeTextFile(path, content);
	}
	return joinPath(root, starter.mainFile);
}
