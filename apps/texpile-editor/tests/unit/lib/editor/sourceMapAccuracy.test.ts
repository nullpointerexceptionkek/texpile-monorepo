// Accuracy net for the block sourceMap over realistic file shapes and constructs: every
// uniquely-occurring word is mapped visual->source and source->visual and compared against
// ground truth. Guards the offset derivation (the fragment wrapper bug) and keeps the
// word-anchor heuristic from silently regressing. Thresholds are floors, not targets.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Node as PMNode } from 'prosemirror-model';
import { parseLatexFile, bodyOffsetOf } from '$lib/workspace/latexRoundtrip';
import { buildBlockMap, pmPosToSourceOffset, sourceOffsetToPmPos } from '$lib/editor/sourceMap';

// the block's visible text with a PM position per char, mirroring the sourceMap's own indexing
function visibleIndex(doc: PMNode): { text: string; positions: number[] } {
	let text = '';
	const positions: number[] = [];
	let sawBlock = false;
	doc.nodesBetween(0, doc.content.size, (node, pos) => {
		if (node.isText && node.text) {
			for (let k = 0; k < node.text.length; k++) {
				positions.push(pos + k);
				text += node.text[k];
			}
		} else if (node.isLeaf && node.isInline) {
			positions.push(pos);
			text += '￼';
		} else if (node.isTextblock) {
			if (sawBlock) {
				positions.push(pos);
				text += '\n';
			}
			sawBlock = true;
		}
		return true;
	});
	return { text, positions };
}

interface Accuracy {
	n: number;
	fwdExact: number;
	fwdWithin2: number;
	fwdWorst: number;
	revWithin2: number;
}

function measure(src: string): Accuracy {
	const parsed = parseLatexFile(src);
	const doc = parsed.doc;
	const map = buildBlockMap(doc, bodyOffsetOf(parsed));
	const vis = visibleIndex(doc);

	const words = [...src.matchAll(/[A-Za-z]{4,}|[一-鿿]{3,}/g)].filter((m) => !src.slice(Math.max(0, m.index - 1), m.index).includes('\\'));
	const out: Accuracy = { n: 0, fwdExact: 0, fwdWithin2: 0, fwdWorst: 0, revWithin2: 0 };
	for (const m of words) {
		const w = m[0];
		if (src.indexOf(w) !== src.lastIndexOf(w)) continue; // ambiguous truth
		const vi = vis.text.indexOf(w);
		if (vi < 0 || vi !== vis.text.lastIndexOf(w)) continue;
		const srcEnd = m.index + w.length;
		const pmPos = vi + w.length < vis.positions.length ? vis.positions[vi + w.length] : vis.positions[vis.positions.length - 1] + 1;
		const fwd = pmPosToSourceOffset(doc, map, pmPos);
		const rev = sourceOffsetToPmPos(doc, map, srcEnd);
		out.n++;
		const fe = fwd == null ? 999 : Math.abs(fwd - srcEnd);
		if (fe === 0) out.fwdExact++;
		if (fe <= 2) out.fwdWithin2++;
		out.fwdWorst = Math.max(out.fwdWorst, fe);
		if (rev != null && Math.abs(rev - pmPos) <= 2) out.revWithin2++;
	}
	return out;
}

const PROSE = `\\section{Introduction}

Plain prose with several unique tokens: quartz, fjord, zephyr and crocodile all appear once.

\\subsection{Deeper structure}

Another paragraph mentioning galaxies and wombats explicitly, followed by \\textbf{bold claims}
and \\emph{emphasized remarks} inside markup.

\\begin{itemize}
	\\item First bullet with elephants inside.
	\\item Second bullet with giraffes instead.
\\end{itemize}

Inline math $x^2 + y_i$ sits here, then trailing words continue afterwards.

\\begin{equation}
	E = mc^2
\\end{equation}

Final paragraph carrying concluding sentiments and farewell greetings.
`;

const wrap = (body: string, pre = '\\documentclass{article}\n\\usepackage{amsmath}\n') =>
	`${pre}\\begin{document}\n${body}\\end{document}\n`;

describe('sourceMap accuracy', () => {
	const cases: [string, string, { exactFloor: number; within2Floor: number }][] = [
		// the fragment wrapper bug regression: identical content must map equally well both ways
		['fragment', PROSE, { exactFloor: 0.85, within2Floor: 0.9 }],
		['full document', wrap(PROSE), { exactFloor: 0.85, within2Floor: 0.9 }],
		// a commented-out \begin{document} above the real one must not shift the split
		[
			'comment trap',
			wrap(PROSE, '\\documentclass{article}\n% \\begin{document} not the real one\n'),
			{ exactFloor: 0.85, within2Floor: 0.9 }
		],
		// content after \end{document} (notes, scratch) rides in the postamble
		['postamble tail', wrap(PROSE) + '% scratch notes after the end\n', { exactFloor: 0.85, within2Floor: 0.9 }],
		[
			'quotes and dashes',
			wrap(`It's a writer's habit --- em-dashes, \`\`quoted phrases'' and don't-style contractions everywhere.

Second paragraph keeps ordinary sentences alongside, so anchors can breathe naturally.
`),
			{ exactFloor: 0.5, within2Floor: 0.6 }
		],
		[
			'cjk',
			wrap(`中文段落测试文本，包含独特词汇：琥珀色的黄昏与遥远的灯塔。

第二段继续叙述，渔船缓缓驶入平静的港湾，星光洒落在海面上。
`),
			{ exactFloor: 0.5, within2Floor: 0.7 }
		]
	];

	for (const [name, src, floors] of cases) {
		it(`maps ${name} at word accuracy`, () => {
			const a = measure(src);
			console.log(name, JSON.stringify(a));
			expect(a.n).toBeGreaterThan(3); // the oracle found enough unambiguous words
			expect(a.fwdExact / a.n).toBeGreaterThanOrEqual(floors.exactFloor);
			expect(a.fwdWithin2 / a.n).toBeGreaterThanOrEqual(floors.within2Floor);
		});
	}

	it('maps the shipped tutorial fragment at word accuracy (the real repro)', () => {
		const src = readFileSync('src/lib/workspace/starters/tutorial/basics.tex', 'utf8').replace(/\r\n?/g, '\n');
		const a = measure(src);
		console.log('basics.tex', JSON.stringify(a));
		expect(a.fwdExact / a.n).toBeGreaterThanOrEqual(0.9);
		expect(a.fwdWorst).toBeLessThanOrEqual(10);
	});
});
