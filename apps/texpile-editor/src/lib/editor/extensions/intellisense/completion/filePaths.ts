// file path completion inside \includegraphics/\input/\bibliography/etc, sourced from
// filePathStore (a flat, project-wide, root-relative file list). unlike LaTeX Workshop's
// directory-by-directory disk walk, the flat list already fuzzy-matches a whole relative path in
// one step, so there's no separate "select a directory to see its contents" chaining to port.
import { get } from 'svelte/store';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { filePathStore } from '$lib/stores/editorStore';

const IMG_EXTS = ['png', 'jpg', 'jpeg', 'pdf', 'eps', 'gif', 'svg', 'webp', 'bmp'];

// commands whose {...} arg is a file path, with the extensions each one wants
const FILE_CMD_EXTS: Record<string, string[]> = {
	includegraphics: IMG_EXTS,
	includesvg: ['svg'],
	includepdf: ['pdf'],
	input: ['tex'],
	include: ['tex'],
	subfile: ['tex'],
	subfileinclude: ['tex'],
	bibliography: ['bib'],
	addbibresource: ['bib'],
	loadglsentries: ['tex']
};

const FILEPATH_BEFORE = new RegExp(
	`\\\\(${Object.keys(FILE_CMD_EXTS).join('|')}|lstinputlisting|verbatiminput|inputminted)\\*?(?:\\[[^\\]]*\\])*\\{[^{}]*$`
);

export function filePathCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const file = ctx.matchBefore(FILEPATH_BEFORE);
	if (!file) return null;
	let paths = get(filePathStore);
	if (!paths.length) return null;
	const cmd = /\\([a-zA-Z]+)/.exec(file.text)?.[1] ?? '';
	const exts = FILE_CMD_EXTS[cmd];
	if (exts) paths = paths.filter((p) => exts.some((e) => p.toLowerCase().endsWith('.' + e)));
	const from = file.from + file.text.lastIndexOf('{') + 1;
	return { from, options: paths.map((p) => ({ label: p, type: 'text' })), validFor: /^[^{}]*$/ };
}
