// inserts an empty trailing paragraph after block nodeviews (math, tables, code, raw latex) so the
// cursor can be placed after them; the paragraphs serialize to nothing
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';

export const BLOCK_NODEVIEW_TYPES = new Set(['block_math', 'table_wrapper', 'code_block', 'raw_latex']);

export const trailingParagraphPluginKey = new PluginKey('trailing-paragraph');

function isBlockNodeView(node: Node): boolean {
	return BLOCK_NODEVIEW_TYPES.has(node.type.name);
}

/** the trailing-paragraph transaction, or null if none needed. shared by the plugin and the
 *  editor's load path: appendTransaction never fires on the initial state, so without a load-time
 *  pass the FIRST keystroke would insert every missing paragraph at once and visibly jump the
 *  document. byte-neutral for the .tex, the paragraphs serialize to nothing. */
export function buildTrailingParagraphTr(state: EditorState): Transaction | null {
	const { doc, schema, tr } = state;
	const paragraphType = schema.nodes.paragraph;
	if (!paragraphType) return null;

	const insertions: number[] = [];
	doc.descendants((node, pos) => {
		if (!isBlockNodeView(node)) return true;
		const afterPos = pos + node.nodeSize;
		try {
			const $after = doc.resolve(afterPos);
			const nodeAfter = $after.nodeAfter;
			if (!nodeAfter || nodeAfter.type.name !== 'paragraph') insertions.push(afterPos);
		} catch {
			// position invalid, skip
		}
		return true;
	});
	if (insertions.length === 0) return null;

	// reverse order keeps earlier positions valid
	insertions.sort((a, b) => b - a);
	let modified = false;
	for (const pos of insertions) {
		try {
			tr.insert(pos, paragraphType.create());
			modified = true;
		} catch {
			// insertion failed, skip
		}
	}
	return modified ? tr : null;
}

export function createTrailingParagraphPlugin() {
	return new Plugin({
		key: trailingParagraphPluginKey,

		appendTransaction(transactions, oldState, newState) {
			if (!transactions.some((tr) => tr.docChanged)) return null;
			return buildTrailingParagraphTr(newState);
		}
	});
}
