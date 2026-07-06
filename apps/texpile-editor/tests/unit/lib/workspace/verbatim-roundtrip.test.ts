import { describe, it, expect } from 'vitest';
import { Fragment, type Node } from 'prosemirror-model';
import { schema } from '$lib/schema/schema';
import { parseLatexFile, serializeLatexFile } from '../../../../src/lib/workspace/latexRoundtrip';

// verbatim source preservation: untouched blocks round-trip byte-for-byte via the `orig` attr
// (importer stamps the source slice + parse-time norm; the serializer re-emits the slice only
// while the block still serializes to that norm). the oracle for that contract: a no-edit save
// is byte-identical, an edit's blast radius is one block (or one source group), and stale
// slices can never overwrite an edit or resurrect a deletion.

const PREAMBLE = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}`;

// deliberately gnarly body: hard-wrapped prose, irregular spacing, sameline + standalone
// comments, a heading with no blank line before the next paragraph, a double blank line,
// tab-indented list items, a math environment with a tab, a verbatim tabular, an unknown
// environment with args, and raw spacing chips. none of this survives the deterministic
// serializer; all of it must survive verbatim.
const BODY = `Intro paragraph wrapped
across two lines with   odd
spacing and a chip \\vspace{2pt} inline.

\\section{One}
Text right after the heading line, plus math $x+y$.


Double blank line above this paragraph.

% a standalone comment
\\begin{itemize}
	\\item First item
	\\item Second item with \\textbf{bold}
\\end{itemize}

\\begin{equation}
	E = mc^2
\\end{equation}

\\begin{tabular}{ll}
a & b \\\\
\\end{tabular}

\\begin{customenv}[opt]
Some content.
\\end{customenv}

Final paragraph.`;

const FILE = `${PREAMBLE}\n${BODY}\n\\end{document}\n`;

function reserialize(file: string, doc?: Node): string {
	const parsed = parseLatexFile(file);
	return serializeLatexFile(parsed, doc ?? parsed.doc);
}

function replaceChild(doc: Node, index: number, node: Node | null): Node {
	const kids: Node[] = [];
	for (let i = 0; i < doc.childCount; i++) {
		if (i === index) {
			if (node) kids.push(node);
		} else {
			kids.push(doc.child(i));
		}
	}
	return doc.copy(Fragment.fromArray(kids));
}

function childIndexWithText(doc: Node, text: string): number {
	for (let i = 0; i < doc.childCount; i++) {
		if (doc.child(i).textContent.includes(text)) return i;
	}
	return -1;
}

describe('verbatim round-trip (no edits)', () => {
	it('parses to a schema-valid doc (doc.check())', () => {
		// lenient builders (NodeType.create) let a content-model violation through silently;
		// such a doc loads fine but freezes the editor on the first structural edit
		expect(() => parseLatexFile(FILE).doc.check()).not.toThrow();
	});

	it('is byte-identical for the whole file', () => {
		expect(reserialize(FILE)).toBe(FILE);
	});

	it('is byte-identical after a worker-style toJSON/fromJSON round-trip', () => {
		const parsed = parseLatexFile(FILE);
		const rehydrated = schema.nodeFromJSON(parsed.doc.toJSON());
		expect(serializeLatexFile(parsed, rehydrated)).toBe(FILE);
	});

	it('stamps a self-consistent body-relative orig.start on every sliced block', () => {
		// `orig.start` powers positional consumers (the mode-switch scroll sync): the body at
		// that offset must be the slice, and offsets must be non-decreasing in document order
		// (group members share the env's start)
		const parsed = parseLatexFile(FILE);
		const body = FILE.slice(parsed.preamble.length, FILE.indexOf('\\end{document}'));
		let last = -1;
		let checked = 0;
		for (let i = 0; i < parsed.doc.childCount; i++) {
			const orig = parsed.doc.child(i).attrs.orig as { latex?: string; start?: number } | null;
			if (!orig?.latex) continue;
			expect(typeof orig.start).toBe('number');
			expect(body.slice(orig.start!, orig.start! + orig.latex.length)).toBe(orig.latex);
			expect(orig.start!).toBeGreaterThanOrEqual(last); // non-decreasing in document order
			last = orig.start!;
			checked++;
		}
		expect(checked).toBeGreaterThan(5); // the gnarly body has many sliced blocks
	});

	it('is byte-identical for a fragment file (no document wrapper)', () => {
		const fragment = 'A fragment paragraph\nwrapped by hand.\n\n\\begin{itemize}\n\t\\item one\n\\end{itemize}\n';
		expect(reserialize(fragment)).toBe(fragment);
	});

	it('preserves legacy \\vspace{\\baselineskip} lines verbatim', () => {
		const file = `${PREAMBLE}\nBefore.\n\n\\vspace{\\baselineskip}\n\nAfter.\n\\end{document}\n`;
		expect(reserialize(file)).toBe(file);
	});
});

describe('edit blast radius is one block', () => {
	it('regenerates only the edited paragraph; neighbours stay byte-identical', () => {
		const parsed = parseLatexFile(FILE);
		const idx = childIndexWithText(parsed.doc, 'Double blank line');
		expect(idx).toBeGreaterThan(-1);
		const child = parsed.doc.child(idx);
		// mimic a ProseMirror edit: same type, attrs copied (stale orig included), new content
		const edited = child.type.create(child.attrs, schema.text('Edited text.'));
		const out = serializeLatexFile(parsed, replaceChild(parsed.doc, idx, edited));

		// the edit landed (normalized form), the stale slice did not win
		expect(out).toContain('Edited text.');
		expect(out).not.toContain('Double blank line above this paragraph.');
		// untouched gnarly regions are still byte-exact
		expect(out).toContain('Intro paragraph wrapped\nacross two lines with   odd\nspacing');
		expect(out).toContain('\\section{One}\nText right after the heading line, plus math $x+y$.');
		expect(out).toContain('\\begin{itemize}\n\t\\item First item\n\t\\item Second item with \\textbf{bold}\n\\end{itemize}');
		expect(out).toContain('\\begin{equation}\n\tE = mc^2\n\\end{equation}');
		expect(out).toContain('% a standalone comment');
	});

	it('reaches a fixed point after an edit', () => {
		const parsed = parseLatexFile(FILE);
		const idx = childIndexWithText(parsed.doc, 'Final paragraph');
		const child = parsed.doc.child(idx);
		const edited = child.type.create(child.attrs, schema.text('Changed ending.'));
		const once = serializeLatexFile(parsed, replaceChild(parsed.doc, idx, edited));
		const twice = reserialize(once);
		expect(twice).toBe(once);
	});

	it('an inserted-then-empty paragraph is a no-op (pristine neighbours re-join)', () => {
		const parsed = parseLatexFile(FILE);
		const idx = childIndexWithText(parsed.doc, 'Double blank line');
		const kids: Node[] = [];
		for (let i = 0; i < parsed.doc.childCount; i++) {
			kids.push(parsed.doc.child(i));
			if (i === idx) kids.push(schema.nodes.paragraph.create());
		}
		const out = serializeLatexFile(parsed, parsed.doc.copy(Fragment.fromArray(kids)));
		expect(out).toBe(FILE);
	});
});

describe('group (one source construct -> many blocks) is all-or-nothing', () => {
	function listIndices(doc: Node): number[] {
		const idx: number[] = [];
		for (let i = 0; i < doc.childCount; i++) if (doc.child(i).type.name === 'list') idx.push(i);
		return idx;
	}

	it('a deleted item is NOT resurrected by the shared slice', () => {
		const parsed = parseLatexFile(FILE);
		const lists = listIndices(parsed.doc);
		expect(lists.length).toBe(2);
		const out = serializeLatexFile(parsed, replaceChild(parsed.doc, lists[1], null));
		expect(out).not.toContain('Second item');
		// regenerated form: item text present, exactly one \item and one coherent env
		expect(out).toContain('First item');
		expect(out.match(/\\item/g)?.length).toBe(1);
		expect(out.match(/\\begin\{itemize\}/g)?.length).toBe(1);
		expect(out.match(/\\end\{itemize\}/g)?.length).toBe(1);
	});

	it('editing one item regenerates the whole environment coherently', () => {
		const parsed = parseLatexFile(FILE);
		const lists = listIndices(parsed.doc);
		const item = parsed.doc.child(lists[1]);
		const editedPara = schema.nodes.paragraph.create(null, schema.text('replacement item'));
		const edited = item.type.create(item.attrs, editedPara);
		const out = serializeLatexFile(parsed, replaceChild(parsed.doc, lists[1], edited));
		expect(out).toContain('replacement item');
		expect(out).not.toContain('Second item');
		expect(out.match(/\\begin\{itemize\}/g)?.length).toBe(1);
		expect(out.match(/\\end\{itemize\}/g)?.length).toBe(1);
		// the sibling paragraph above the list is still byte-exact
		expect(out).toContain('Double blank line above this paragraph.');
	});
});
