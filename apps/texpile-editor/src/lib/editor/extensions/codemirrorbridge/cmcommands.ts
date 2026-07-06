import { NodeSelection, type EditorState, type Transaction } from 'prosemirror-state';
import { trackFeatureUsed } from '$lib/plausible';

export function createCodeBlock(): (state: EditorState, dispatch: (tr: Transaction) => void) => boolean {
	return function (state: EditorState, dispatch: (tr: Transaction) => void): boolean {
		trackFeatureUsed('code_block');
		const { from } = state.selection;
		const codeBlockNode = state.schema.nodes.code_block.createAndFill();

		if (codeBlockNode) {
			const tr = state.tr.insert(from, codeBlockNode);
			const nodeSelecton = NodeSelection.create(tr.doc, from + 1);
			tr.setSelection(nodeSelecton);

			dispatch(tr);
			return true;
		}

		return false;
	};
}
