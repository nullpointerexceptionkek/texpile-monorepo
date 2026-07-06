// find/rewrite file-path references via the AST (never regex) for the move-aware reference
// updater. matches exact or sans-extension (LaTeX lets you omit .tex/.png), preserves the
// original's extension style, and splices via source offsets so the rest of the file is untouched.
import { parseLatex } from './parser';
import { findAll } from './ast-utils';
import { printRaw } from '@unified-latex/unified-latex-util-print-raw';
import type { Macro } from '@unified-latex/unified-latex-types';

// explicit signatures so the mandatory {path} arg always attaches (some of these live in CTAN
// packages the bundled DB doesn't include, e.g. graphicx).
const FILEREF_PARSE_OPTS = {
	macros: {
		includegraphics: { signature: 'o m' },
		includesvg: { signature: 'o m' },
		includepdf: { signature: 'o m' },
		input: { signature: 'm' },
		include: { signature: 'm' },
		subfile: { signature: 'm' },
		bibliography: { signature: 'm' },
		addbibresource: { signature: 'o m' },
		lstinputlisting: { signature: 'o m' },
		verbatiminput: { signature: 'm' }
	}
};
const FILE_COMMANDS = new Set(Object.keys(FILEREF_PARSE_OPTS.macros));

const stripExt = (p: string) => p.replace(/\.[^./\\]+$/, '');

type Ref = { innerStart: number; innerEnd: number; current: string };

function collectRefs(latex: string): Ref[] {
	const ast = parseLatex(latex, FILEREF_PARSE_OPTS);
	const out: Ref[] = [];
	const offset = (n: unknown, end = false) => {
		const p = (n as { position?: { start?: { offset?: number }; end?: { offset?: number } } }).position;
		return (end ? p?.end?.offset : p?.start?.offset) ?? null;
	};
	for (const node of findAll(ast, (n) => (n as Macro).type === 'macro' && FILE_COMMANDS.has((n as Macro).content ?? ''))) {
		const arg = ((node as Macro).args ?? []).filter((a) => a.openMark === '{').pop(); // the mandatory {path}
		const content = arg?.content;
		if (!content?.length) continue;
		const innerStart = offset(content[0]);
		const innerEnd = offset(content[content.length - 1], true);
		if (innerStart == null || innerEnd == null) continue;
		out.push({ innerStart, innerEnd, current: printRaw(content).trim() });
	}
	return out;
}

function matching(refs: Ref[], targetRel: string): Ref[] {
	const t = stripExt(targetRel);
	return refs.filter((r) => r.current === targetRel || stripExt(r.current) === t);
}

/** How many references in `latex` point at `targetRel` (exact or sans-extension). */
export function countFileRefs(latex: string, targetRel: string): number {
	return matching(collectRefs(latex), targetRel).length;
}

/** Repoint every reference to `targetRel` to `newRel`, preserving the original's extension style. */
export function replaceFileRefs(latex: string, targetRel: string, newRel: string): { text: string; count: number } {
	const refs = matching(collectRefs(latex), targetRel);
	if (!refs.length) return { text: latex, count: 0 };
	let text = latex;
	// Splice last → first so earlier offsets stay valid.
	for (const r of [...refs].sort((a, b) => b.innerStart - a.innerStart)) {
		const hadExt = /\.[^./\\]+$/.test(r.current);
		const replacement = hadExt ? newRel : stripExt(newRel);
		text = text.slice(0, r.innerStart) + replacement + text.slice(r.innerEnd);
	}
	return { text, count: refs.length };
}
