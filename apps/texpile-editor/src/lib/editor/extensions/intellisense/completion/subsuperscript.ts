// subscript/superscript completion: mines every ^{...} / _{...} already used elsewhere in the
// buffer and offers them again — a pure repetition aid, no bundled data (matches LaTeX Workshop's
// subsuperscript.ts, which does the same mining from its own AST instead of a regex scan).
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

const SCRIPT_TRIGGER = /[\^_]\{[^{}]*$/;
const SCRIPT_USAGE = /([\^_])\{([^{}]+)\}/g;

const MAX_SCAN_LENGTH = 2_000_000;
let cache: { text: string; sub: string[]; sup: string[] } | null = null;

function scan(text: string): { sub: string[]; sup: string[] } {
	if (text.length > MAX_SCAN_LENGTH) return { sub: [], sup: [] };
	const sub = new Set<string>();
	const sup = new Set<string>();
	let m: RegExpExecArray | null;
	SCRIPT_USAGE.lastIndex = 0;
	while ((m = SCRIPT_USAGE.exec(text))) (m[1] === '^' ? sup : sub).add(m[2]);
	return { sub: [...sub], sup: [...sup] };
}

export function subsuperscriptCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const match = ctx.matchBefore(SCRIPT_TRIGGER);
	if (!match) return null;
	const text = ctx.state.doc.toString();
	if (!cache || cache.text !== text) cache = { text, ...scan(text) };
	const isSup = match.text.startsWith('^');
	const values = isSup ? cache.sup : cache.sub;
	if (!values.length) return null;
	const options: Completion[] = values.map((v) => ({ label: v, type: 'text' }));
	return { from: match.from + 2, options, validFor: /^[^{}]*$/ };
}
