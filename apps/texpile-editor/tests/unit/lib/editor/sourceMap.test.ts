import { describe, it, expect } from 'vitest';
import type { Node } from 'prosemirror-model';
import { schema } from '$lib/schema/schema';
import { parseLatexFile } from '../../../../src/lib/workspace/latexRoundtrip';
import { buildBlockMap, blockAtSource, pmPosToSourceOffset, sourceOffsetToPmPos, sourceStartAt } from '$lib/editor/sourceMap';

const SRC = [
	'\\documentclass{article}',
	'\\begin{document}',
	'Alpha opening words with a \\textbf{bold} claim and more prose to anchor on.',
	'',
	'\\section{Methods setup}',
	'',
	'Second paragraph where zebra quantum banana appears exactly once, then zebra again.',
	'',
	'\\end{document}'
].join('\n');

function setup() {
	const parsed = parseLatexFile(SRC);
	return { doc: parsed.doc, map: buildBlockMap(parsed.doc, parsed.preamble.length) };
}

/** doc position just after the nth occurrence of a plain word. */
function pmPosAfter(doc: Node, needle: string, nth = 1): number {
	let count = 0;
	let found = -1;
	doc.descendants((node, pos) => {
		if (found >= 0) return false;
		if (node.isText && node.text) {
			for (let idx = node.text.indexOf(needle); idx >= 0; idx = node.text.indexOf(needle, idx + 1)) {
				count++;
				if (count === nth) {
					found = pos + idx + needle.length;
					return false;
				}
			}
		}
		return true;
	});
	return found;
}

describe('sourceMap', () => {
	it('pm -> source anchors on the surrounding text, not a proportional guess', () => {
		const { doc, map } = setup();
		const pmPos = pmPosAfter(doc, 'banana');
		expect(pmPos).toBeGreaterThan(0);
		expect(pmPosToSourceOffset(doc, map, pmPos)).toBe(SRC.indexOf('banana') + 'banana'.length);
	});

	it('source -> pm lands on the right occurrence of a repeated word', () => {
		const { doc, map } = setup();
		const offset = SRC.lastIndexOf('zebra') + 'zebra'.length;
		expect(blockAtSource(map, offset)?.index).toBe(2); // the second paragraph
		expect(sourceOffsetToPmPos(doc, map, offset)).toBe(pmPosAfter(doc, 'zebra', 2));
	});

	it('heading offsets land inside the heading, and unstamped blocks fall back to the block above', () => {
		const { doc, map } = setup();
		const hit = blockAtSource(map, SRC.indexOf('Methods'));
		expect(hit?.index).toBe(1);
		const pos = sourceOffsetToPmPos(doc, map, SRC.indexOf('setup'));
		expect(pos).toBeGreaterThan(hit!.pmPos);
		expect(pos).toBeLessThan(hit!.pmEnd);

		// an editor-created paragraph carries no orig: it maps to the nearest stamped block above
		const extra = schema.nodes.paragraph.create(null, schema.text('freshly typed'));
		const doc2 = doc.type.create(doc.attrs, [...Array.from({ length: doc.childCount }, (_, i) => doc.child(i)), extra]);
		const map2 = buildBlockMap(doc2, parseLatexFile(SRC).preamble.length);
		expect(map2[map2.length - 1].srcStart).toBeNull();
		const mapped = pmPosToSourceOffset(doc2, map2, map2[map2.length - 1].pmPos + 2);
		expect(mapped).toBe(sourceStartAt(map2, map2.length - 1));
		expect(mapped).not.toBeNull();
	});
});
