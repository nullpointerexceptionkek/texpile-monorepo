// \command completion: the bundled CTAN signature DB (same one the parser uses), LaTeX Workshop's
// vendored default set (data/lwMacros.ts), and the user's OWN \newcommand/\NewDocumentCommand
// definitions scanned live from the buffer (LaTeX Workshop calls this "user-defined macros"; here
// it's listNewcommands reused from the parser's own converter.ts, not a bespoke scanner).
import { snippetCompletion, type Completion } from '@codemirror/autocomplete';
import { macroInfo } from '@unified-latex/unified-latex-ctan';
import { listNewcommands } from '@unified-latex/unified-latex-util-macros';
import { parseLatex } from '$lib/latex-parser/parser';
import { MACRO_SIGNATURES, ENV_SIGNATURES } from '$lib/latex-parser/macros';
import { macroCompletion, withAutoChain } from './shared';
import { withFrecency } from './frecency';
import { LW_MACROS, type LwMacro } from '../data/lwMacros';

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

const STATIC_SIGNATURES = collectSignatures(macroInfo as InfoMap, EXTRA_MACROS);
const STATIC_NAMES = new Set(STATIC_SIGNATURES.keys());

// \end mirrors the vendored \begin: insert "\end{" and chain into the environment-name list
const END_MACRO: LwMacro = { label: 'end', snippet: 'end{', detail: 'End an environment', chain: true };

function lwCompletion(m: LwMacro): Completion {
	const base: Completion = m.snippet
		? snippetCompletion('\\' + m.snippet, { label: '\\' + m.label, type: 'function', detail: m.detail })
		: { label: '\\' + m.label, type: 'function', detail: m.detail };
	return m.chain ? withAutoChain(base) : base;
}

const LW_OPTIONS: Completion[] = [...LW_MACROS, END_MACRO]
	.filter((m) => !STATIC_NAMES.has(m.label)) // guard against future unified-latex DB growth
	.map(lwCompletion);
const LW_NAMES = new Set(LW_MACROS.map((m) => m.label));

export const STATIC_MACRO_OPTIONS: Completion[] = [
	...[...STATIC_SIGNATURES].map(([name, sig]) => macroCompletion(name, sig)),
	...LW_OPTIONS
];

const MAX_SCAN_LENGTH = 2_000_000; // guards against re-parsing megabytes per keystroke
let cache: { text: string; options: Completion[] } | null = null;

function computeUserMacros(text: string): Completion[] {
	if (text.length > MAX_SCAN_LENGTH) return [];
	try {
		const ast = parseLatex(text, { macros: MACRO_SIGNATURES, environments: ENV_SIGNATURES });
		const seen = new Set<string>();
		const out: Completion[] = [];
		for (const m of listNewcommands(ast)) {
			// skip names the static DB already documents ("avoid over populating suggestions")
			if (STATIC_NAMES.has(m.name) || LW_NAMES.has(m.name) || seen.has(m.name)) continue;
			seen.add(m.name);
			out.push({ ...macroCompletion(m.name, m.signature), detail: `${renderUserDetail(m.signature)} (defined in this file)` });
		}
		return out;
	} catch {
		return []; // unparseable mid-edit buffer: static completions still work
	}
}

function renderUserDetail(signature: string): string {
	const mandatory = signature.split(/\s+/).filter((t) => t === 'm').length;
	return mandatory ? '{}'.repeat(mandatory) : '';
}

/** static + user-defined macro completions for the current buffer text, frecency-boosted. */
export function macroOptions(text: string): Completion[] {
	if (!cache || cache.text !== text) cache = { text, options: computeUserMacros(text) };
	return withFrecency([...STATIC_MACRO_OPTIONS, ...cache.options]);
}

/** looks up a macro's completion by name, for hover. null means "not a recognized macro". */
export function macroLookup(text: string, name: string): { detail?: string } | null {
	const found = macroOptions(text).find((o) => o.label === '\\' + name);
	return found ? { detail: found.detail as string | undefined } : null;
}
