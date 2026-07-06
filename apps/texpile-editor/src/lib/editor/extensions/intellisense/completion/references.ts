// \ref-family completion, sourced from labelStore (populated from \label{} by extractDocRefs)
// plus a light supplementary scan for the environment key-value form \begin{fig}[label=name].
import { get } from 'svelte/store';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { labelStore } from '$lib/stores/editorStore';
import { lastListToken } from './shared';

// the \ref family (explicit list, not "\* contains ref": \href would otherwise match too), plus
// \hyperref[...] and \crefrange{a}{b}'s second arg
const REF_BEFORE =
	/(?:\\hyperref\[[^\]]*$)|(?:\\(?:ref|eqref|pageref|autoref|nameref|cref|Cref|cpageref|Cpageref|vref|Vref|labelcref)\*?(?:\[[^\]]*\])?\{[^{}]*$)|(?:\\[Cc]refrange\*?\{[^{}]*\}\{[^{}]*$)/;

// label=name (or {name}) inside an environment's optional key-value args, e.g.
// \begin{figure}[label=fig:x]. enumerate/itemize excluded: enumitem's label= option styles list
// markers, it isn't a cross-reference.
const KEYVAL_LABEL = /label\s*=\s*(?:\{([^}]+)\}|([^,\]}\s]+))/g;
const NON_REF_ENVS = /\\begin\{\s*(?:itemize|enumerate)\s*\}/;

function keyValueLabels(text: string): string[] {
	const out: string[] = [];
	// cheap guard: skip the scan entirely if there's no "label=" anywhere in the buffer
	if (!text.includes('label')) return out;
	let m: RegExpExecArray | null;
	KEYVAL_LABEL.lastIndex = 0;
	while ((m = KEYVAL_LABEL.exec(text))) {
		// the label= itself might sit inside an itemize/enumerate optional-arg styling option;
		// a precise check would need brace matching, this cheap nearby-context check is enough
		// for the common false-positive shape (enumitem's label={...} right after \begin{itemize}).
		const before = text.slice(Math.max(0, m.index - 60), m.index);
		if (NON_REF_ENVS.test(before)) continue;
		const key = (m[1] ?? m[2] ?? '').trim();
		if (key) out.push(key);
	}
	return out;
}

/** labelStore plus any label= key-value labels found in the current buffer text. */
export function allLabels(bufferText: string): string[] {
	const fromStore = get(labelStore) ?? [];
	const fromKeyVal = keyValueLabels(bufferText);
	return fromKeyVal.length ? [...new Set([...fromStore, ...fromKeyVal])] : fromStore;
}

export function referenceCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const ref = ctx.matchBefore(REF_BEFORE);
	if (!ref) return null;
	const labels = allLabels(ctx.state.doc.toString());
	if (!labels.length) return null;
	return lastListToken(
		ref,
		labels.map((l) => ({ label: l, type: 'variable' }))
	);
}
