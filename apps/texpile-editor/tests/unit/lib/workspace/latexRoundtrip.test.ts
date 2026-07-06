import { describe, it, expect } from 'vitest';
import { Node } from 'prosemirror-model';
import { parseLatexFile, serializeLatexFile } from '../../../../src/lib/workspace/latexRoundtrip';

// workspace-level round-trip on real ProseMirror Nodes (no JSON intermediate)

const wrap = (body: string) => `\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n${body}\n\\end{document}\n`;

describe('parseLatexFile → Node → serializeLatexFile', () => {
	it('returns a real ProseMirror Node, not JSON', () => {
		const p = parseLatexFile(wrap('\\section{Intro}\nHello.'));
		expect(p.doc).toBeInstanceOf(Node);
		expect(p.doc.type.name).toBe('doc');
	});

	it('preserves the preamble verbatim and regenerates the body', () => {
		const tex = wrap('\\section{Intro}\nHello \\textbf{world}.');
		const p = parseLatexFile(tex);
		const out = serializeLatexFile(p, p.doc);

		// preamble is spliced back untouched
		expect(out.startsWith(p.preamble)).toBe(true);
		expect(out.trimEnd().endsWith(p.postamble.trimEnd())).toBe(true);
		// body was regenerated from the Node
		expect(out).toContain('\\section{Intro}');
		expect(out).toContain('Hello \\textbf{world}.');
	});

	// structural round-trip stability is covered by the serializer's own tests; the body
	// isn't byte-stable at this level, so we don't assert that here

	it('serializeLatexFile is synchronous and returns a string', () => {
		const p = parseLatexFile(wrap('x'));
		const out = serializeLatexFile(p, p.doc);
		expect(typeof out).toBe('string');
	});
});
