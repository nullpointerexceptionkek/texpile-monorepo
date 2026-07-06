import { describe, it, expect } from 'vitest';
import { countFileRefs, replaceFileRefs } from '../../../../src/lib/latex-parser/filerefs';

const tex = '\\includegraphics{images/old.png}\nText.\n\\input{chapters/old}\n\\includegraphics[width=5cm]{images/old.png}';

describe('file references (AST)', () => {
	it('counts references (exact and sans-extension)', () => {
		expect(countFileRefs(tex, 'images/old.png')).toBe(2);
		expect(countFileRefs(tex, 'chapters/old.tex')).toBe(1); // \input{chapters/old} matches sans-ext
		expect(countFileRefs(tex, 'nothere.png')).toBe(0);
	});

	it('repoints matching references and leaves the rest untouched', () => {
		const { text, count } = replaceFileRefs(tex, 'images/old.png', 'images/new.png');
		expect(count).toBe(2);
		expect(text).toContain('\\includegraphics{images/new.png}');
		expect(text).toContain('\\includegraphics[width=5cm]{images/new.png}');
		expect(text).toContain('\\input{chapters/old}'); // not a match → untouched
	});

	it('preserves the extension style of the original reference', () => {
		// reference omitted the extension → replacement omits it too
		expect(replaceFileRefs('\\input{chapters/old}', 'chapters/old.tex', 'chapters/new.tex').text).toBe('\\input{chapters/new}');
	});

	it('is a no-op when nothing matches', () => {
		expect(replaceFileRefs(tex, 'nope.png', 'x.png')).toEqual({ text: tex, count: 0 });
	});
});
