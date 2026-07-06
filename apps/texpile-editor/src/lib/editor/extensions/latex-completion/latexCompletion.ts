// latex autocomplete for CodeMirror, shared by source mode and the raw/inline latex node views.
// data comes from the same unified-latex CTAN signature DB the parser uses, so what we can parse we can complete.
import {
	autocompletion,
	snippetCompletion,
	type Completion,
	type CompletionContext,
	type CompletionResult
} from '@codemirror/autocomplete';
import { tooltips } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { get } from 'svelte/store';
import { referenceStore, labelStore, filePathStore } from '$lib/stores/editorStore';
import { macroInfo, environmentInfo } from '@unified-latex/unified-latex-ctan';

type InfoMap = Record<string, Record<string, { signature?: string }>>;

// flatten per-package CTAN records to name/signature; first definition wins
function collectSignatures(info: InfoMap, extra: Record<string, string> = {}): Map<string, string> {
	const out = new Map<string, string>();
	for (const pkg of Object.values(info))
		for (const [name, def] of Object.entries(pkg)) if (!out.has(name)) out.set(name, def.signature ?? '');
	for (const [name, sig] of Object.entries(extra)) if (!out.has(name)) out.set(name, sig);
	return out;
}

// amsmath/amssymb constructs the bundled packages may omit; keep this tiny
const EXTRA_MACROS: Record<string, string> = {
	text: 'm',
	eqref: 'm',
	mathbb: 'm',
	mathcal: 'm',
	mathbf: 'm',
	mathrm: 'm',
	boldsymbol: 'm',
	DeclareMathOperator: 'm m'
};
const EXTRA_ENVS: Record<string, string> = {
	align: '',
	'align*': '',
	gather: '',
	'gather*': '',
	multline: '',
	'multline*': '',
	cases: '',
	equation: '',
	'equation*': '',
	matrix: '',
	pmatrix: '',
	bmatrix: ''
};

// render an xparse signature ("o m") as the shape users actually recognize ("[]{}")
function renderSignature(signature: string): string | undefined {
	if (!signature) return undefined;
	const parts = signature.split(/\s+/).map((tok) => {
		if (tok === 'm') return '{}';
		if (tok === 'o' || tok.startsWith('O')) return '[]';
		if (tok === 's') return '*';
		if (tok === 'v') return '||';
		if (/^[dDrR]..$/.test(tok)) return tok[1] + tok[2]; // custom delimiters, e.g. "d()" -> "()"
		if (/^t.$/.test(tok)) return tok[1]; // single-token flag, e.g. "t+" -> "+"
		return ''; // embellishments and anything exotic: not worth showing
	});
	const rendered = parts.join('');
	return rendered || undefined;
}

// mandatory args insert a snippet with tab stops; optional/star args are skipped for simplicity
function macroCompletion(name: string, signature: string): Completion {
	const mandatory = signature.split(/\s+/).filter((t) => t === 'm').length;
	const detail = renderSignature(signature);
	if (mandatory === 0) return { label: '\\' + name, type: 'function', detail };
	let template = '\\' + name;
	for (let i = 1; i <= mandatory; i++) template += `{\${${i}}}`;
	return snippetCompletion(template, { label: '\\' + name, type: 'function', detail });
}

const MACRO_OPTIONS: Completion[] = [...collectSignatures(macroInfo as InfoMap, EXTRA_MACROS)].map(([name, sig]) =>
	macroCompletion(name, sig)
);
const ENV_OPTIONS: Completion[] = [...collectSignatures(environmentInfo as InfoMap, EXTRA_ENVS)]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([name, sig]) => ({ label: name, type: 'class', detail: renderSignature(sig) }));

// the \cite family, with optional [..] prenote/postnote args
const CITE_BEFORE = /\\[a-zA-Z]*cite[a-zA-Z]*\*?(?:\[[^\]]*\])*\{[^{}]*/;
// the \ref family, but not \href/\url
const REF_BEFORE = /\\(?:ref|eqref|pageref|autoref|nameref|cref|Cref|cpageref|Cpageref|vref|Vref|labelcref)\*?\{[^{}]*/;
// commands whose {...} arg is a file path, with the extensions each one wants
const IMG_EXTS = ['png', 'jpg', 'jpeg', 'pdf', 'eps', 'gif', 'svg', 'webp', 'bmp'];
const FILE_CMD_EXTS: Record<string, string[]> = {
	includegraphics: IMG_EXTS,
	includesvg: ['svg'],
	includepdf: ['pdf'],
	input: ['tex'],
	include: ['tex'],
	subfile: ['tex'],
	bibliography: ['bib'],
	addbibresource: ['bib']
};
const FILEPATH_BEFORE = new RegExp(
	`\\\\(${Object.keys(FILE_CMD_EXTS).join('|')}|lstinputlisting|verbatiminput|inputminted)\\*?(?:\\[[^\\]]*\\])*\\{[^{}]*`
);

// complete the last comma-separated token inside a {...} key list (citations, cross-references)
function bracedKeyResult(match: { from: number; text: string }, options: Completion[]): CompletionResult {
	const sepAt = Math.max(match.text.lastIndexOf('{'), match.text.lastIndexOf(','));
	const lead = match.text.slice(sepAt + 1);
	const from = match.from + sepAt + 1 + (lead.length - lead.trimStart().length); // skip spaces after the separator
	return { from, options, validFor: /^[^,{}\s]*$/ };
}

export function latexCompletionSource(ctx: CompletionContext): CompletionResult | null {
	// 1) environment name inside \begin{…} / \end{…}
	const env = ctx.matchBefore(/\\(?:begin|end)\{[a-zA-Z*]*/);
	if (env) {
		const from = env.from + env.text.indexOf('{') + 1;
		return { from, options: ENV_OPTIONS, validFor: /^[a-zA-Z*]*$/ };
	}

	// 2) bib key inside a \cite-family argument
	const cite = ctx.matchBefore(CITE_BEFORE);
	if (cite) {
		const refs = get(referenceStore) ?? [];
		if (!refs.length) return null;
		return bracedKeyResult(
			cite,
			refs.map((r) => ({
				label: r.key,
				detail: r.title ? String(r.title).slice(0, 50) : r.author ? String(r.author).slice(0, 50) : undefined,
				type: 'variable'
			}))
		);
	}

	// 3) \label key inside a \ref-family argument
	const ref = ctx.matchBefore(REF_BEFORE);
	if (ref) {
		const labels = get(labelStore);
		if (!labels.length) return null;
		return bracedKeyResult(
			ref,
			labels.map((l) => ({ label: l, type: 'variable' }))
		);
	}

	// 4) file path inside \includegraphics/\input/\bibliography args, from workspace files
	//    filtered to the type each command wants
	const file = ctx.matchBefore(FILEPATH_BEFORE);
	if (file) {
		let paths = get(filePathStore);
		if (!paths.length) return null;
		const cmd = /\\([a-zA-Z]+)/.exec(file.text)?.[1] ?? '';
		const exts = FILE_CMD_EXTS[cmd];
		if (exts) paths = paths.filter((p) => exts.some((e) => p.toLowerCase().endsWith('.' + e)));
		const from = file.from + file.text.lastIndexOf('{') + 1;
		return { from, options: paths.map((p) => ({ label: p, type: 'text' })), validFor: /^[^{}]*$/ };
	}

	// 5) command name after a backslash (needs a letter typed, or explicit Ctrl-Space)
	const macro = ctx.matchBefore(/\\[a-zA-Z]*/);
	if (macro && (macro.to - macro.from > 1 || ctx.explicit)) {
		return { from: macro.from, options: MACRO_OPTIONS, validFor: /^\\[a-zA-Z]*$/ };
	}
	return null;
}

/**
 * latex autocompletion extension. pass tooltipsInBody for editors embedded in the PM doc
 * so the completion popup isn't clipped by the node's box.
 */
export function latexAutocomplete(opts: { tooltipsInBody?: boolean } = {}): Extension {
	const ext: Extension[] = [autocompletion({ override: [latexCompletionSource], activateOnTyping: true, icons: false })];
	if (opts.tooltipsInBody) ext.push(tooltips({ parent: document.body }));
	return ext;
}
