import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { atSuggestionCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/atSuggestions';

function completeAt(doc: string) {
	const state = EditorState.create({ doc });
	return atSuggestionCompletionSource(new CompletionContext(state, doc.length, false));
}
const labels = (r: ReturnType<typeof completeAt>) => (r?.options ?? []).map((o) => o.label);

describe('@-suggestion mnemonic completion', () => {
	it('offers @/ for \\frac{}{}', () => {
		const r = completeAt('@/');
		expect(labels(r)).toContain('@/');
		const frac = r?.options.find((o) => o.label === '@/');
		expect(typeof frac?.apply).toBe('function'); // snippet with tab stops
	});

	it('offers greek letter mnemonics', () => {
		expect(labels(completeAt('@a'))).toContain('@a');
	});

	it('replaces from the "@"', () => {
		const r = completeAt('hello @s');
		expect(r?.from).toBe('hello '.length);
	});

	it('returns nothing without an "@"', () => {
		expect(completeAt('hello world')).toBeNull();
	});
});
