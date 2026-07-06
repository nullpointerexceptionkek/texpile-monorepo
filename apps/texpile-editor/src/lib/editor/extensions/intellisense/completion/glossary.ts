// glossary/acronym completion for \gls/\glspl/\acs/\acl/\acf/etc, sourced from
// \newglossaryentry/\newacronym definitions scanned out of the buffer text.
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { lastListToken } from './shared';

interface GlossEntry {
	key: string;
	description: string;
	acronym: boolean;
}

// the glossaries package's macro family: \gls, \glspl, \glstext, \glsdisp, \Glsname, \acs, \acl,
// \acf, \acp, \Acrlong, ... (case-insensitive, matching LaTeX Workshop's own enumeration)
const GLOSS_TRIGGER =
	/\\(gls(?:str)?(?:pl|text|first|fmt(?:text|short|long)|plural|firstplural|name|symbol|desc|disp|user(?:i|ii|iii|iv|v|vi))?|Acr(?:long|full|short)?(?:pl)?|ac[slf]?p?)(?:\[[^\]]*\])?\{[^{}]*$/i;

const MAX_SCAN_LENGTH = 2_000_000;
let cache: { text: string; entries: GlossEntry[] } | null = null;

function balancedArg(text: string, openBrace: number): { content: string; end: number } | null {
	if (text[openBrace] !== '{') return null;
	let depth = 0;
	for (let i = openBrace; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') {
			depth--;
			if (depth === 0) return { content: text.slice(openBrace + 1, i), end: i + 1 };
		}
	}
	return null;
}

function scan(text: string): GlossEntry[] {
	if (text.length > MAX_SCAN_LENGTH) return [];
	const entries: GlossEntry[] = [];

	const glossRe = /\\(?:new|provide)glossaryentry\{([^{}]+)\}\s*\{/g;
	let m: RegExpExecArray | null;
	while ((m = glossRe.exec(text))) {
		const body = balancedArg(text, m.index + m[0].length - 1);
		if (!body) continue;
		const desc = /description\s*=\s*(\{([^{}]*)\}|[^,}]+)/.exec(body.content);
		entries.push({ key: m[1].trim(), description: (desc?.[2] ?? desc?.[1] ?? '').trim(), acronym: false });
	}

	const acroRe = /\\new(?:acronym|abbreviation|abbr)(?:\[[^\]]*\])?\{([^{}]+)\}\{([^{}]*)\}\{([^{}]*)\}/g;
	while ((m = acroRe.exec(text))) entries.push({ key: m[1].trim(), description: m[3].trim(), acronym: true });

	return entries;
}

export function glossaryCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const match = ctx.matchBefore(GLOSS_TRIGGER);
	if (!match) return null;
	const text = ctx.state.doc.toString();
	if (!cache || cache.text !== text) cache = { text, entries: scan(text) };
	if (!cache.entries.length) return null;

	// macros starting with "ac" (case-insensitive) are acronym-specific; \gls itself can point at either
	const macroName = /\\([a-zA-Z]+)/.exec(match.text)?.[1] ?? '';
	const acronymOnly = /^ac/i.test(macroName);
	const pool = acronymOnly ? cache.entries.filter((e) => e.acronym) : cache.entries;
	if (!pool.length) return null;

	const options: Completion[] = pool.map((e) => ({ label: e.key, detail: e.description || undefined, type: 'variable' }));
	return lastListToken(match, options);
}
