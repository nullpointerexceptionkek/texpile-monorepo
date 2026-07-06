import { describe, it, expect } from 'vitest';
import { extractOutline } from '../../../../../../src/lib/editor/extensions/intellisense/outline';

describe('outline/symbol extraction', () => {
	it('extracts sections in document order with their levels', () => {
		const text = '\\section{Intro}\ntext\n\\subsection{Background}\ntext\n\\section{Methods}';
		const items = extractOutline(text);
		expect(items.map((i) => i.text)).toEqual(['Intro', 'Background', 'Methods']);
		expect(items.map((i) => i.level)).toEqual([3, 4, 3]); // section=3, subsection=4 (part=1..subsubsection=5)
	});

	it('strips inline macros from a section title', () => {
		const text = '\\section{\\textbf{Bold} Title}';
		expect(extractOutline(text)[0].text).toBe('Bold Title');
	});

	it('includes notable environments alongside sections, in position order', () => {
		const text = '\\section{A}\n\\begin{figure}\n...\n\\end{figure}\n\\section{B}';
		const items = extractOutline(text);
		expect(items.map((i) => i.kind)).toEqual(['section', 'environment', 'section']);
	});

	it('returns an empty list for a document with no sections', () => {
		expect(extractOutline('just some prose')).toEqual([]);
	});
});
