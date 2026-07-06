import { describe, it, expect } from 'vitest';
import { extractLabels } from '../../../../src/lib/latex-parser/labels';

describe('extractLabels (AST)', () => {
	it('collects \\label keys across the document', () => {
		const tex = '\\section{Intro}\\label{sec:intro}\nText \\label{eq:main} more.\n\\begin{figure}\\label{fig:one}\\end{figure}';
		expect(extractLabels(tex).sort()).toEqual(['eq:main', 'fig:one', 'sec:intro']);
	});

	it('dedupes and ignores \\ref / \\cite', () => {
		const tex = '\\label{a}\\ref{a}\\cite{a}\\label{a}\\label{b}';
		expect(extractLabels(tex).sort()).toEqual(['a', 'b']);
	});

	it('returns [] for text with no labels', () => {
		expect(extractLabels('just some prose')).toEqual([]);
	});
});
