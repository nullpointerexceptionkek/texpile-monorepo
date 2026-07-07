import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parseLatexFile } from '$lib/workspace/latexRoundtrip';
import { loadCases } from '../../testFixtures';

// cases live in ./fixtures/verbatim-cases.tex, named via `% === CASE: name ===` markers (see loadCases)
const CASES = loadCases(join(__dirname, 'fixtures', 'verbatim-cases.tex'));
const get = (name: string) => {
	const src = CASES.get(name);
	if (src == null) throw new Error(`fixture case not found: ${name}`);
	return src;
};

describe('verbatim-family environments are not silently dropped', () => {
	it('a plain, well-formed verbatim block is visible in the parsed doc', () => {
		const parsed = parseLatexFile(get('plain well-formed verbatim block'));
		expect(parsed.doc.textContent).toContain('code here');
	});

	it('does not silently drop a recognized verbatim block even inside pathological/invalid surrounding LaTeX', () => {
		const parsed = parseLatexFile(get('pathological nested-looking verbatim (user-reported)'));
		expect(parsed.doc.textContent).toContain('\\begin{quote}');
		expect(parsed.doc.textContent).toContain('\\subsubsection');
	});

	// unified-latex gives `comment`/`filecontents` this same dedicated node shape (not just
	// verbatim/verbatim*), but they have no envHandler entry, so they must fall back to an
	// opaque raw_latex chip (matching VERBATIM_ENVS) rather than look like an editable code_block.
	it('comment/filecontents environments (also verbatim-shaped) are preserved, not silently dropped', () => {
		const parsed = parseLatexFile(get('comment environment (also verbatim-shaped, must stay a raw chip not a code block)'));
		expect(parsed.doc.textContent).toContain('this is commented out');
	});
});
