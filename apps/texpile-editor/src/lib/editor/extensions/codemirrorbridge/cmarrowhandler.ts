import { keymap } from 'prosemirror-keymap';
import { Selection } from 'prosemirror-state';

// at a textblock edge, arrow the cursor into an adjacent code block
function cmarrowHandler(dir) {
	return (state, dispatch, view) => {
		if (state.selection.empty && view.endOfTextblock(dir)) {
			const side = dir == 'left' || dir == 'up' ? -1 : 1;
			const $head = state.selection.$head;
			const nextPos = Selection.near(state.doc.resolve(side > 0 ? $head.after() : $head.before()), side);
			if (nextPos.$head && nextPos.$head.parent.type.name == 'code_block') {
				dispatch(state.tr.setSelection(nextPos));
				return true;
			}
		}
		return false;
	};
}

export const cmarrowHandlers = keymap({
	ArrowLeft: cmarrowHandler('left'),
	ArrowRight: cmarrowHandler('right'),
	ArrowUp: cmarrowHandler('up'),
	ArrowDown: cmarrowHandler('down')
});
