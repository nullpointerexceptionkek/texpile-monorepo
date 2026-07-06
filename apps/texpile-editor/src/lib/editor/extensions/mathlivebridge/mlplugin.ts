import { Plugin, PluginKey, type PluginSpec } from 'prosemirror-state';
import { EditorView, type NodeViewConstructor } from 'prosemirror-view';
import type { Node } from 'prosemirror-model';
import MathLiveView from './mlview.svelte';

export interface MathLivePluginState {
	/** cursor pos before entering a math node, decides front vs back placement on expand. */
	prevCursorPos: number;
}
const MATHLIVE_PLUGIN_KEY = new PluginKey<MathLivePluginState>('prosemirror-mathlive');

const mathPluginSpec: PluginSpec<MathLivePluginState> = {
	key: MATHLIVE_PLUGIN_KEY,
	state: {
		init() {
			return {
				prevCursorPos: 0
			};
		},
		apply(tr, value, oldState) {
			return {
				prevCursorPos: oldState.selection.from
			};
		}
	},
	props: {
		nodeViews: {
			inline_math: createMathView(false),
			block_math: createMathView(true)
		},
		handleClickOn(view, _pos, node, nodePos, event, direct) {
			const me = event as MouseEvent;
			if (!direct || me.button !== 0 || me.shiftKey || me.metaKey || me.ctrlKey || me.altKey) return false;
			if (node.isTextblock && node.type.name === 'paragraph') {
				const onlyMLsOrEmpty = node.childCount == 1 && node.child(0).type.name === 'inline_math';

				if (onlyMLsOrEmpty) {
					console.log('Placed Cursor at end of paragraph with only math fields');
					const endPos = nodePos + node.nodeSize - 1; // last valid text position inside the paragraph
					const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, endPos));
					view.dispatch(tr);
					view.focus();
					return true;
				}
			}
			return false;
		}
	}
};

export const mathlivePlugin = new Plugin(mathPluginSpec);

export function createMathView(displayMode: boolean): NodeViewConstructor {
	return (node: Node, view: EditorView, getPos: boolean | (() => number | undefined)): MathLiveView => {
		const nodeView = new MathLiveView(node, view, getPos as () => number, MATHLIVE_PLUGIN_KEY, displayMode);

		return nodeView;
	};
}

import { keymap } from 'prosemirror-keymap';
import { NodeSelection, TextSelection, EditorState, Transaction } from 'prosemirror-state';
// a row holding only an inline math node has no valid cursor position, so browsers make
// the cursor jump on up/down arrows. place the cursor manually instead.
function mlVerticalArrowHandler(dir: 'up' | 'down') {
	return (state: EditorState, dispatch: (tr: Transaction) => void): boolean => {
		const { $from } = state.selection;
		const isCurrentRowMath = containsMathField($from.parent);

		try {
			if (isCurrentRowMath) {
				const nextPos = dir === 'up' ? $from.before() : $from.after();
				if (nextPos !== null && typeof nextPos === 'number') {
					const resolvedPos = state.doc.resolve(dir === 'up' ? nextPos - 1 : nextPos + 1);
					dispatch(state.tr.setSelection(TextSelection.create(state.doc, resolvedPos.pos)));
					return true;
				}
			}
			const prevRow = getPreviousRow($from);
			if (prevRow !== null) {
				const prevRowContainsMath = containsMathField(prevRow);
				if (prevRowContainsMath) {
					const resolvedPos = state.doc.resolve(dir === 'up' ? $from.before() - 1 : $from.after() + 1);
					dispatch(state.tr.setSelection(TextSelection.create(state.doc, resolvedPos.pos)));
					return true;
				}
			}
			const nextRow = getNextRow($from);
			if (nextRow !== null) {
				const nextRowContainsMath = containsMathField(nextRow);
				if (nextRowContainsMath) {
					const resolvedPos = state.doc.resolve(dir === 'up' ? $from.before() - 1 : $from.after() + 1);
					dispatch(state.tr.setSelection(TextSelection.create(state.doc, resolvedPos.pos)));
					return true;
				}
			}
		} catch (e) {
			if (e instanceof RangeError) {
				console.log('RangeError');
			} else {
				throw e;
			}
		}

		return false;
	};
}

function getPreviousRow($from): Node | null {
	const beforePos = $from.before(1);
	const $before = $from.doc.resolve(beforePos);
	return $before.nodeBefore;
}

function getNextRow($from): Node | null {
	const afterPos = $from.after(1);
	const $after = $from.doc.resolve(afterPos);
	return $after.nodeAfter;
}

function containsMathField(node: Node): boolean {
	let found = false;
	node.content.forEach((child) => {
		if (child.type.name === 'inline_math') {
			found = true;
		}
	});
	return found;
}

// selects an adjacent mathfield on left/right when there is no text node between it and the cursor.
function mlHorizontalArrowHandler(dir: 'left' | 'right') {
	return (state: EditorState, dispatch: (tr: Transaction) => void, _view): boolean => {
		const { $from, empty } = state.selection;
		if (!empty) return false;

		const parent = $from.parent;
		if (parent.type.name !== 'paragraph') return false;

		const indexInParent = $from.index();

		if (dir === 'right') {
			if (indexInParent < parent.childCount) {
				const nextChild = parent.child(indexInParent);
				if (nextChild.type.name === 'inline_math') {
					const offsetInParent = $from.parentOffset;
					let posBeforeNext = 0;
					for (let i = 0; i < indexInParent; i++) {
						posBeforeNext += parent.child(i).nodeSize;
					}
					if (offsetInParent === posBeforeNext) {
						const mathPos = $from.before() + 1 + posBeforeNext;
						const tr = state.tr.setSelection(NodeSelection.create(state.doc, mathPos));
						dispatch(tr);
						return true;
					}
				}
			}
		} else {
			if (indexInParent > 0) {
				const prevChild = parent.child(indexInParent - 1);
				if (prevChild.type.name === 'inline_math') {
					const offsetInParent = $from.parentOffset;
					let posAfterPrev = 0;
					for (let i = 0; i < indexInParent; i++) {
						posAfterPrev += parent.child(i).nodeSize;
					}
					if (offsetInParent === posAfterPrev) {
						const mathPos = $from.before() + 1 + posAfterPrev - prevChild.nodeSize;
						const tr = state.tr.setSelection(NodeSelection.create(state.doc, mathPos));
						dispatch(tr);
						return true;
					}
				}
			}
		}

		return false;
	};
}

/** must come before the regular keymap in plugin order. */
export const mlarrowHandlers = keymap({
	ArrowUp: mlVerticalArrowHandler('up'),
	ArrowDown: mlVerticalArrowHandler('down'),
	ArrowRight: mlHorizontalArrowHandler('right'),
	ArrowLeft: mlHorizontalArrowHandler('left')
});
