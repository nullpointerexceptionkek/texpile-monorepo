import { describe, it, expect } from 'vitest';
import { EditorState, Transaction, type TransactionSpec } from '@codemirror/state';
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

	it('includes the LaTeX Workshop default envs the CTAN DB misses', () => {
		const r = completeAt('\\begin{');
		for (const name of ['center', 'quote', 'verbatim', 'flushright', 'titlepage']) {
			expect(
				r?.options.some((o) => o.label === name),
				name
			).toBe(true);
		}
	});

	it('list envs open with their first \\item in the ForBegin block', () => {
		const doc = '\\begin{itemize';
		const r = completeAt(doc);
		const itemize = r!.options.find((o) => o.label === 'itemize')!;
		let state = EditorState.create({ doc });
		const view = {
			get state() {
				return state;
			},
			dispatch(spec: Transaction | TransactionSpec) {
				state = spec instanceof Transaction ? spec.state : state.update(spec).state;
			}
		};
		(itemize.apply as (view: unknown, completion: unknown, from: number, to: number) => void)(view, itemize, r!.from, doc.length);
		// \t in the snippet becomes the state's indent unit on apply
		expect(state.doc.toString()).toMatch(/^\\begin\{itemize\}\n\s+\\item \n\\end\{itemize\}$/);
	});
});
