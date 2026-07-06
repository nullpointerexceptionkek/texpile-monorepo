import { describe, it, expect } from 'vitest';
import { mergeReferences, parseBibItems } from '../../../../src/lib/workspace/citations';

const bibA = `@book{smith2020, author = {Smith, J.}, title = {Alpha}, year = {2020}}`;
const bibB = `@book{jones2019, author = {Jones, K.}, title = {Beta}, year = {2019}}`;
const bibDupe = `@book{smith2020, author = {Other, X.}, title = {Different}, year = {1999}}`;

describe('mergeReferences (multiple .bib files)', () => {
	it('merges entries from several files', () => {
		const keys = mergeReferences([bibA, bibB]).map((r) => r.key);
		expect(keys).toEqual(['smith2020', 'jones2019']);
	});

	it('de-dupes by key, first file wins', () => {
		const merged = mergeReferences([bibA, bibDupe]);
		expect(merged).toHaveLength(1);
		expect(merged[0].key).toBe('smith2020');
		expect(merged[0].title).toBe('Alpha'); // from bibA, not the later duplicate
	});

	it('skips an unparseable file instead of failing the whole load', () => {
		const keys = mergeReferences(['@@@ not valid bibtex {{{', bibB]).map((r) => r.key);
		expect(keys).toContain('jones2019');
	});
});

// IEEE-template style embedded bibliography
const ieeeBib = `\\begin{thebibliography}{00}
\\bibitem{b1} G. Eason, B. Noble, and I. N. Sneddon, \`\`On certain integrals of Lipschitz-Hankel type involving products of Bessel functions,'' Phil. Trans. Roy. Soc. London, vol. A247, pp. 529--551, April 1955.
\\bibitem{b2} J. Clerk Maxwell, A Treatise on Electricity and Magnetism, 3rd ed., vol. 2. Oxford: Clarendon, 1892, pp.68--73.
\\bibitem{b3} K. Elissa, \`\`Title of paper if known,'' unpublished.
\\end{thebibliography}`;

describe('parseBibItems (embedded thebibliography)', () => {
	it('extracts every \\bibitem key', () => {
		const keys = parseBibItems(ieeeBib).map((r) => r.key);
		expect(keys).toEqual(['b1', 'b2', 'b3']);
	});

	it('pulls best-effort author / quoted title / year for autocomplete display', () => {
		const [b1] = parseBibItems(ieeeBib);
		expect(b1.author).toBe('G. Eason, B. Noble, and I. N. Sneddon');
		expect(b1.title).toBe('On certain integrals of Lipschitz-Hankel type involving products of Bessel functions');
		expect(b1.year).toBe('1955');
		expect(b1.fromBibitem).toBe(true);
	});

	it('falls back to "Name, rest" splitting when there is no quoted title', () => {
		const b2 = parseBibItems(ieeeBib)[1];
		expect(b2.author).toBe('J. Clerk Maxwell');
		expect(b2.title).toContain('A Treatise on Electricity and Magnetism');
		expect(b2.year).toBe('1892');
	});

	it('handles an entry with no year (unpublished)', () => {
		const b3 = parseBibItems(ieeeBib)[2];
		expect(b3.title).toBe('Title of paper if known');
		expect(b3.year).toBeUndefined();
	});

	it('supports the optional [label] argument and de-dupes keys', () => {
		const refs = parseBibItems('\\bibitem[Foo 99]{foo} A. Author, some text, 1999.\n\\bibitem{foo} duplicate.');
		expect(refs).toHaveLength(1);
		expect(refs[0].key).toBe('foo');
	});

	it('returns nothing for a document without \\bibitem', () => {
		expect(parseBibItems('\\section{Intro}\nNo bibliography here.')).toEqual([]);
	});

	it('ignores \\bibitem inside verbatim and comments (AST scan, not regex)', () => {
		const tex = [
			'\\begin{verbatim}',
			'\\bibitem{fake1} Not a real entry.',
			'\\end{verbatim}',
			'% \\bibitem{fake2} commented out',
			'\\begin{thebibliography}{9}',
			"\\bibitem{real} A. Author, ``A real title,'' 2001.",
			'\\end{thebibliography}'
		].join('\n');
		const keys = parseBibItems(tex).map((r) => r.key);
		expect(keys).toEqual(['real']);
	});
});
