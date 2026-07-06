// \cite-family completion, sourced from the parsed .bib entries already loaded into referenceStore.
import { get } from 'svelte/store';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { referenceStore } from '$lib/stores/editorStore';
import { lastListToken } from './shared';

// the \cite family, with optional [..] prenote/postnote args, plus \bibentry
const CITE_BEFORE = /\\(?:[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?|bibentry)(?:\[[^\]]*\])*\{[^{}]*$/;

export function citationCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const cite = ctx.matchBefore(CITE_BEFORE);
	if (!cite) return null;
	const refs = get(referenceStore) ?? [];
	if (!refs.length) return null;
	return lastListToken(
		cite,
		refs.map((r) => ({
			label: r.key,
			detail: r.title ? String(r.title).slice(0, 50) : r.author ? String(r.author).slice(0, 50) : undefined,
			type: 'variable'
		}))
	);
}
