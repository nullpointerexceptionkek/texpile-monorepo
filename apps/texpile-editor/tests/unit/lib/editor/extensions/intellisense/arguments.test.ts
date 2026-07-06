import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { argumentCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/arguments';

function completeAt(doc: string) {
	const state = EditorState.create({ doc });
	return argumentCompletionSource(new CompletionContext(state, doc.length, false));
}
const labels = (r: ReturnType<typeof completeAt>) => (r?.options ?? []).map((o) => o.label);

describe('generic argument key-value completion', () => {
	it('offers standard class options inside \\documentclass[...]', () => {
		const r = completeAt('\\documentclass[10');
		expect(labels(r)).toContain('10pt');
	});

	it('offers \\includegraphics keys', () => {
		expect(labels(completeAt('\\includegraphics[wid'))).toContain('width=');
	});

	it('offers \\hypersetup keys', () => {
		expect(labels(completeAt('\\hypersetup{colorli'))).toContain('colorlinks=true');
	});

	it('offers \\usepackage[...]{natbib} option keywords, gated on the package name', () => {
		const r = completeAt('\\usepackage[aut');
		// no package name yet on the line: natbib-specific options should not appear
		expect(labels(r)).not.toContain('authoryear');
	});

	it('resolves package options once the package name is present later on the line', () => {
		const state = EditorState.create({ doc: '\\usepackage[authoryear]{natbib}' });
		const ctx = new CompletionContext(state, '\\usepackage[auth'.length, false);
		const result = argumentCompletionSource(ctx);
		expect((result?.options ?? []).some((o) => o.label === 'authoryear')).toBe(true);
	});

	it('completes xcolor color names inside \\textcolor{...}', () => {
		expect(labels(completeAt('\\textcolor{Mar'))).toContain('Maroon');
	});

	it('completes \\colorbox{...} and \\fcolorbox{...}{...} color slots', () => {
		expect(labels(completeAt('\\colorbox{r'))).toContain('red');
		expect(labels(completeAt('\\fcolorbox{black}{r'))).toContain('red');
	});

	it('completes \\bibliographystyle{...} and \\citestyle{...}', () => {
		expect(labels(completeAt('\\bibliographystyle{pla'))).toContain('plain');
		expect(labels(completeAt('\\citestyle{pla'))).toContain('plain');
	});

	it('returns nothing for an unrecognized macro argument', () => {
		expect(completeAt('\\foobar{x')).toBeNull();
	});
});
