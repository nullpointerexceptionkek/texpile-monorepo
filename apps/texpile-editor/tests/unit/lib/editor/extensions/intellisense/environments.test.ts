import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { environmentCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/environments';

function completeAt(doc: string, pos = doc.length) {
	const state = EditorState.create({ doc });
	return environmentCompletionSource(new CompletionContext(state, pos, false));
}

describe('environment completion: ForBegin + close-environment', () => {
	it('a fresh \\begin{ builds the whole block on accept', () => {
		const r = completeAt('\\begin{ite');
		const itemize = r?.options.find((o) => o.label === 'itemize');
		expect(itemize).toBeTruthy();
		expect(typeof itemize?.apply).toBe('function'); // snippet, not a plain label insert
	});

	it('mid-edit (content already follows on the same line) stays a plain name completion', () => {
		const doc = '\\begin{tabul}{c c}\n\\end{tabular}';
		// cursor right after "tabul", with "}{c c}" already typed on the same line
		const r = completeAt(doc, '\\begin{tabul'.length);
		const tabular = r?.options.find((o) => o.label === 'tabular');
		expect(tabular).toBeTruthy();
		expect(tabular?.apply).toBeUndefined(); // plain name, not a snippet — would duplicate the block otherwise
	});

	it('offers the matching \\end{...} the instant \\begin{name} is closed by hand', () => {
		const r = completeAt('\\begin{itemize}');
		expect(r?.options).toHaveLength(1);
		expect(r?.options[0].label).toBe('\\end{itemize}');
	});

	it('still completes plain names inside \\end{…}', () => {
		const r = completeAt('\\end{item');
		expect(r?.options.some((o) => o.label === 'itemize')).toBe(true);
	});
});
