// Bidirectional block-level map between a parsed editor doc and its LaTeX source, built on the
// orig spans the importer stamps on top-level blocks. Inside a block, positions refine by text
// anchoring (the same trick SyncTeX drift-correction uses); proportional interpolation is the
// fallback for markup the anchor can't find. Consumers: mode-switch caret/scroll sync today,
// remote cursors and block-scoped re-parse later.

import type { Node } from 'prosemirror-model';

export interface BlockSpan {
	index: number;
	/** doc position of the block node itself. */
	pmPos: number;
	pmEnd: number;
	/** absolute source offset of the block's span start; null on editor-created blocks. */
	srcStart: number | null;
	latex: string | null;
}

/** one walk over the top-level blocks; bodyOffset (the preamble length) absolutizes orig.start. */
export function buildBlockMap(doc: Node, bodyOffset: number): BlockSpan[] {
	const out: BlockSpan[] = [];
	for (let i = 0, pos = 0; i < doc.childCount; i++) {
		const child = doc.child(i);
		const orig = child.attrs?.orig as { start?: number; latex?: string } | undefined;
		out.push({
			index: i,
			pmPos: pos,
			pmEnd: pos + child.nodeSize,
			srcStart: typeof orig?.start === 'number' ? bodyOffset + orig.start : null,
			latex: typeof orig?.latex === 'string' && orig.latex.length ? orig.latex : null
		});
		pos += child.nodeSize;
	}
	return out;
}

/** the block containing a doc position. */
export function blockAtPm(map: BlockSpan[], pmPos: number): BlockSpan | null {
	for (const b of map) if (pmPos >= b.pmPos && pmPos < b.pmEnd) return b;
	return map.length ? map[map.length - 1] : null;
}

/** last stamped block whose span starts at or before the offset (offsets in gaps and unstamped
 *  stretches resolve to the block above, mirroring how the importer attributes them). */
export function blockAtSource(map: BlockSpan[], offset: number): BlockSpan | null {
	let found: BlockSpan | null = null;
	for (const b of map) if (b.srcStart != null && b.srcStart <= offset) found = b;
	return found;
}

/** nearest stamped source start at or above the given block index (editor-created blocks have none). */
export function sourceStartAt(map: BlockSpan[], index: number): number | null {
	for (let i = Math.min(index, map.length - 1); i >= 0; i--) if (map[i].srcStart != null) return map[i].srcStart;
	return null;
}

// the block's visible text with a doc position per character, so string indexes found by
// anchoring convert back to positions. Leaf inlines count as one object-replacement char and
// sibling textblocks are '\n'-separated, mirroring textBetween.
function blockTextIndex(doc: Node, b: BlockSpan): { text: string; positions: number[] } {
	let text = '';
	const positions: number[] = [];
	let sawBlock = false;
	doc.nodesBetween(b.pmPos, b.pmEnd, (node, pos) => {
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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function allIndexes(haystack: string, needle: string): number[] {
	const out: number[] = [];
	for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1)) out.push(i);
	return out;
}

/** strip LaTeX syntax so what's left resembles the rendered text the editor shows. */
function stripLatex(s: string): string {
	return s
		.replace(/(^|[^\\])%[^\n]*/g, '$1')
		.replace(/\\[a-zA-Z@]+\*?/g, ' ')
		.replace(/[\\{}[\]$&~^_]/g, ' ');
}

const nthIndexOf = (text: string, needle: string, n: number): number => {
	let i = -1;
	for (let k = 0; k < n; k++) {
		i = text.indexOf(needle, i + 1);
		if (i < 0) return -1;
	}
	return i;
};

/** absolute source offset for a doc position; block-accurate at worst, char-accurate where the
 *  nearby text can be anchored in the block's original source. */
export function pmPosToSourceOffset(doc: Node, map: BlockSpan[], pmPos: number): number | null {
	const b = blockAtPm(map, pmPos);
	if (!b) return null;
	if (b.srcStart == null || !b.latex) return sourceStartAt(map, b.index);
	const { text, positions } = blockTextIndex(doc, b);
	let ci = positions.length;
	for (let i = 0; i < positions.length; i++) {
		if (positions[i] >= pmPos) {
			ci = i;
			break;
		}
	}
	// longest findable suffix of the text before the caret wins; the proportional estimate breaks
	// ties between repeats
	const before = text.slice(0, ci);
	const est = clamp01(ci / Math.max(1, text.length)) * b.latex.length;
	for (const len of [24, 16, 10, 6, 4]) {
		const anchor = before.slice(-len);
		if (anchor.trim().length < 3 || anchor.includes('￼')) continue;
		const matches = allIndexes(b.latex, anchor);
		if (matches.length) {
			const idx = matches.reduce((best, m) => (Math.abs(m - est) < Math.abs(best - est) ? m : best));
			return b.srcStart + idx + anchor.length;
		}
	}
	return b.srcStart + Math.round(est);
}

/** doc position for an absolute source offset; block-accurate at worst, word-accurate where the
 *  source text before the offset survives into the rendered block. */
export function sourceOffsetToPmPos(doc: Node, map: BlockSpan[], offset: number): number | null {
	const b = blockAtSource(map, offset);
	if (!b || b.srcStart == null) return null;
	const block = doc.child(b.index);
	const clampInside = (pos: number) => Math.min(Math.max(pos, b.pmPos + 1), b.pmPos + Math.max(1, block.nodeSize - 1));
	if (!b.latex) return b.pmPos + 1;
	const rel = Math.min(Math.max(0, offset - b.srcStart), b.latex.length);
	const stripped = stripLatex(b.latex.slice(0, rel));
	const word = stripped.match(/([\p{L}\p{N}]{3,})\s*$/u)?.[1];
	if (word) {
		// which occurrence of the word the offset sits after, so repeats land on the right one
		const occurrence = allIndexes(stripped, word).length;
		const { text, positions } = blockTextIndex(doc, b);
		const idx = nthIndexOf(text, word, occurrence);
		if (idx >= 0) {
			const endI = idx + word.length;
			return clampInside(endI < positions.length ? positions[endI] : positions[positions.length - 1] + 1);
		}
	}
	const frac = clamp01(rel / Math.max(1, b.latex.length));
	return clampInside(b.pmPos + 1 + Math.round(frac * Math.max(0, block.content.size - 1)));
}
