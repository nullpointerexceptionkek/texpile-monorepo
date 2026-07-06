import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { packageClassCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/packagesClasses';

function completeAt(doc: string) {
	const state = EditorState.create({ doc });
	return packageClassCompletionSource(new CompletionContext(state, doc.length, false));
}

describe('package/class name completion', () => {
	it('completes \\documentclass{...}', () => {
		const r = completeAt('\\documentclass{art');
		expect(r?.options.some((o) => o.label === 'article')).toBe(true);
	});

	it('completes \\documentclass[options]{...} (options already typed)', () => {
		const r = completeAt('\\documentclass[12pt]{boo');
		expect(r?.options.some((o) => o.label === 'book')).toBe(true);
	});

	it('completes \\usepackage{...}', () => {
		const r = completeAt('\\usepackage{hyper');
		expect(r?.options.some((o) => o.label === 'hyperref')).toBe(true);
	});

	it('completes only the last name in a \\usepackage{a,b,c} list', () => {
		const r = completeAt('\\usepackage{amsmath,xcol');
		const from = r?.from ?? -1;
		expect(from).toBe('\\usepackage{amsmath,'.length);
		expect(r?.options.some((o) => o.label === 'xcolor')).toBe(true);
	});

	it('returns nothing outside those two macros', () => {
		expect(completeAt('\\section{art')).toBeNull();
	});
});
