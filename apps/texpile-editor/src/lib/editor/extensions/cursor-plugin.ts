// selection-driven UI: shades CM-backed leaves crossed by a range selection (browsers won't),
// and syncs the cursorInCm store the menu bar uses to disable commands that would eat raw blocks.
import { NodeSelection, Plugin, PluginKey } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { cursorInCm } from '$lib/stores/editorStore';

const CM_NODE_TYPES = new Set(['raw_latex', 'code_block', 'block_math']);

// inline forms get the range highlight but don't participate in store sync
const HIGHLIGHT_NODE_TYPES = new Set([...CM_NODE_TYPES, 'inline_math', 'inline_latex']);

/** a range selection fully inside one of these is editing, not crossing. */
const EDITABLE_CM_TYPES = new Set(['code_block', 'raw_latex', 'inline_latex']);

function isCursorInCm(state: EditorState): boolean {
	const $from = state.selection.$from;
	for (let d = $from.depth; d >= 0; d--) {
		if (CM_NODE_TYPES.has($from.node(d).type.name)) return true;
	}
	return false;
}

function buildDecorations(state: EditorState): DecorationSet {
	if (state.selection.empty) return DecorationSet.empty;

	const decorations: Decoration[] = [];
	const { from, to } = state.selection;
	const isNodeSelection = state.selection instanceof NodeSelection;
	state.doc.nodesBetween(from, to, (node, pos) => {
		const start = pos;
		const end = pos + node.nodeSize;
		if (start === end || node.isText) return;
		if (!HIGHLIGHT_NODE_TYPES.has(node.type.name)) return;
		// already visually selected by the NodeSelection
		if (isNodeSelection && from === start && to === end) return;
		// fully inside an editable CM: editing, not crossing
		if (EDITABLE_CM_TYPES.has(node.type.name) && from >= start && to <= end) return;
		decorations.push(Decoration.node(start, end, { class: 'bg-blue-200' }));
	});

	return decorations.length ? DecorationSet.create(state.doc, decorations) : DecorationSet.empty;
}

export const cursorPluginKey = new PluginKey('cursor');

export function createCursorPlugin() {
	return new Plugin({
		key: cursorPluginKey,
		props: {
			decorations(state) {
				try {
					return buildDecorations(state);
				} catch {
					return DecorationSet.empty;
				}
			}
		},
		// cursorInCm sync: cheaper as a view() diff than a decorations() rebuild
		view(view) {
			let last = isCursorInCm(view.state);
			cursorInCm.set(last);
			return {
				update(v) {
					const cur = isCursorInCm(v.state);
					if (cur !== last) {
						last = cur;
						cursorInCm.set(cur);
					}
				},
				destroy() {
					// reset so a stale true doesn't keep the menus disabled
					cursorInCm.set(false);
				}
			};
		}
	});
}
