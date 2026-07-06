import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { latexCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/dispatch';
import { referenceStore, labelStore, filePathStore } from '$lib/stores/editorStore';

function completeAt(doc: string, explicit = false) {
	const state = EditorState.create({ doc });
	return latexCompletionSource(new CompletionContext(state, doc.length, explicit));
}
const labels = (r: ReturnType<typeof completeAt>) => (r?.options ?? []).map((o) => o.label);

describe('latex completion source', () => {
	beforeEach(() => {
		referenceStore.set(null as never);
		labelStore.set([]);
		filePathStore.set([]);
	});

	it('completes commands after a backslash + letter', () => {
		const r = completeAt('\\sec');
		expect(r?.from).toBe(0); // replaces from the backslash
		expect(labels(r)).toContain('\\section');
		expect(labels(r)).toContain('\\subsection');
	});

	it('does not fire on a lone backslash unless explicit', () => {
		expect(completeAt('\\')).toBeNull();
		expect(labels(completeAt('\\', true))).toContain('\\textbf');
	});

	it('shows argument shapes, never raw xparse signature letters', () => {
		const r = completeAt('\\fra');
		const frac = (r?.options ?? []).find((o) => o.label === '\\frac');
		expect(frac?.detail).toBe('{}{}');
		const r2 = completeAt('\\textbf');
		const textbf = (r2?.options ?? []).find((o) => o.label === '\\textbf');
		expect(textbf?.detail).toBe('{}');
		// no completion anywhere shows bare signature letters like "m", "o m", "s o m"
		const all = [...(r?.options ?? []), ...(r2?.options ?? [])];
		expect(all.some((o) => /^[somv](?: [somv])*$/.test(o.detail ?? ''))).toBe(false);
	});

	it('shows environment argument shapes inside \\begin{…}', () => {
		const r = completeAt('\\begin{tabul');
		const tabular = (r?.options ?? []).find((o) => o.label === 'tabular');
		expect(tabular?.detail).toBe('[]{}');
	});

	it('completes environment names inside \\begin{…}', () => {
		const r = completeAt('\\begin{it');
		expect(r?.from).toBe('\\begin{'.length); // inside the braces
		expect(labels(r)).toContain('itemize');
		expect(labels(r)).toContain('enumerate');
	});

	it('completes environment names inside \\end{…} too', () => {
		expect(labels(completeAt('\\end{align'))).toContain('align*');
	});

	it('completes bib keys inside \\cite{…} from referenceStore', () => {
		referenceStore.set([{ key: 'knuth1984', title: 'The TeXbook' }] as never);
		const r = completeAt('\\cite{kn');
		expect(r?.from).toBe('\\cite{'.length);
		expect(labels(r)).toEqual(['knuth1984']);
	});

	it('completes the last key after a comma in a multi-key cite', () => {
		referenceStore.set([{ key: 'a1' }, { key: 'b2' }] as never);
		const r = completeAt('\\citep{a1, b');
		expect(r?.from).toBe('\\citep{a1, '.length); // skips the space after the comma
		expect(labels(r)).toEqual(['a1', 'b2']);
	});

	it('completes \\label keys inside \\ref / \\eqref / \\cref from labelStore', () => {
		labelStore.set(['fig:one', 'eq:main', 'sec:intro']);
		expect(labels(completeAt('\\ref{fig'))).toContain('fig:one');
		expect(labels(completeAt('\\eqref{eq'))).toEqual(['fig:one', 'eq:main', 'sec:intro']);
		const cref = completeAt('\\cref{sec:intro, fig'); // last token after a comma
		expect(cref?.from).toBe('\\cref{sec:intro, '.length);
		expect(labels(cref)).toContain('fig:one');
	});

	it('completes image file paths inside \\includegraphics (filtered to image types)', () => {
		filePathStore.set(['images/plot.png', 'chapters/intro.tex', 'images/diagram.pdf']);
		const r = completeAt('\\includegraphics{im');
		expect(r?.from).toBe('\\includegraphics{'.length);
		expect(labels(r)).toEqual(['images/plot.png', 'images/diagram.pdf']); // .tex excluded
	});

	it('completes .tex files inside \\input, and handles an optional [..] arg first', () => {
		filePathStore.set(['chapters/intro.tex', 'images/plot.png']);
		expect(labels(completeAt('\\input{'))).toEqual(['chapters/intro.tex']);
		expect(labels(completeAt('\\includegraphics[width=5cm]{'))).toEqual(['images/plot.png']);
	});

	it('does not offer labels for \\href (not a cross-reference)', () => {
		labelStore.set(['fig:one']);
		expect(completeAt('\\href{')).toBeNull();
	});

	it('returns nothing for plain prose', () => {
		expect(completeAt('hello world')).toBeNull();
	});

	it('sources a broad command set from the CTAN database, with argument snippets', () => {
		const r = completeAt('\\fra');
		expect(r?.options.length ?? 0).toBeGreaterThan(200); // a real DB, not a hand list
		const frac = r?.options.find((o) => o.label === '\\frac');
		expect(typeof frac?.apply).toBe('function'); // \frac{·}{·} inserted as a snippet
	});
});
