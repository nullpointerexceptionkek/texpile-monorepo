import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { referenceCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/references';
import { labelStore } from '$lib/stores/editorStore';

function completeAt(doc: string) {
	const state = EditorState.create({ doc });
	return referenceCompletionSource(new CompletionContext(state, doc.length, false));
}
const labels = (r: ReturnType<typeof completeAt>) => (r?.options ?? []).map((o) => o.label);

describe('reference completion: label= key-value extras', () => {
	beforeEach(() => labelStore.set([]));

	it('picks up label=name inside an environment optional arg', () => {
		const doc = '\\begin{figure}[label=fig:x]\n\\end{figure}\n\\ref{fig:';
		expect(labels(completeAt(doc))).toContain('fig:x');
	});

	it('picks up label={name} (braced) too', () => {
		const doc = '\\begin{table}[label={tab:results}]\n\\end{table}\n\\ref{tab:';
		expect(labels(completeAt(doc))).toContain('tab:results');
	});

	it('ignores label= on itemize/enumerate (that is enumitem styling, not a cross-reference)', () => {
		const doc = '\\begin{itemize}[label=$\\star$]\n\\item x\n\\end{itemize}\n\\ref{';
		expect(completeAt(doc)).toBeNull();
	});

	it('merges with labels already in labelStore', () => {
		labelStore.set(['sec:intro']);
		const doc = '\\begin{figure}[label=fig:x]\n\\end{figure}\n\\ref{';
		const found = labels(completeAt(doc));
		expect(found).toContain('sec:intro');
		expect(found).toContain('fig:x');
	});
});
