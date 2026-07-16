// helpers shared across completion/*.ts sources.
import { pickedCompletion, snippetCompletion, startCompletion, type Completion, type CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

/** render an xparse signature ("o m") as the shape users actually recognize ("[]{}"). */
export function renderSignature(signature: string): string | undefined {
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

// macros whose accepted completion should immediately reopen the dropdown for their next
// argument (LaTeX Workshop's "post-accept auto-chain": accepting \cite reopens for the key).
const CHAIN_AFTER = /cite|ref|input|include|bibitem|import|gloss|gls|acr/i;

export function needsAutoChain(name: string): boolean {
	return CHAIN_AFTER.test(name);
}

/** wraps a completion's apply so accepting it reopens the completion dropdown one tick later. */
export function withAutoChain(completion: Completion): Completion {
	const baseApply = completion.apply;
	return {
		...completion,
		apply(view: EditorView, comp: Completion, from: number, to: number) {
			if (typeof baseApply === 'function') baseApply(view, comp, from, to);
			else
				view.dispatch({
					changes: { from, to, insert: comp.label },
					selection: { anchor: from + comp.label.length },
					annotations: pickedCompletion.of(comp) // keep the frecency tracker seeing this accept
				});
			// let the insert transaction settle before reopening, same tick would race CM's own state update
			setTimeout(() => startCompletion(view), 0);
		}
	};
}

/** mandatory args insert a snippet with tab stops; optional/star args are skipped for simplicity. */
export function macroCompletion(name: string, signature: string): Completion {
	const mandatory = signature.split(/\s+/).filter((t) => t === 'm').length;
	const detail = renderSignature(signature);
	const base: Completion =
		mandatory === 0
			? { label: '\\' + name, type: 'function', detail }
			: snippetCompletion('\\' + name + Array.from({ length: mandatory }, (_, i) => `{\${${i + 1}}}`).join(''), {
					label: '\\' + name,
					type: 'function',
					detail
				});
	return needsAutoChain(name) ? withAutoChain(base) : base;
}

/** completes the last comma-separated token inside a {...} or [...] key list. */
export function lastListToken(match: { from: number; text: string }, options: Completion[], autoChain = false): CompletionResult {
	const sepAt = Math.max(match.text.lastIndexOf('{'), match.text.lastIndexOf('['), match.text.lastIndexOf(','));
	const lead = match.text.slice(sepAt + 1);
	const from = match.from + sepAt + 1 + (lead.length - lead.trimStart().length); // skip spaces after the separator
	return {
		from,
		options: autoChain ? options.map(withAutoChain) : options,
		validFor: /^[^,{}[\]\s]*$/
	};
}
