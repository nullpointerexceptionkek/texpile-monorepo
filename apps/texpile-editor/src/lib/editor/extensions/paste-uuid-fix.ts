import { Plugin } from 'prosemirror-state';
import { Slice, Fragment } from 'prosemirror-model';
import type { Node } from 'prosemirror-model';
import { generateCopySuffix } from '$lib/editor/utils/label';

// appends '-copy-{uuid}' to labels on pasted tables/images/equations so copies don't duplicate
// labels. \ref nodes are left pointing at the original.

function generateCopyLabel(originalLabel: string): string {
	const shortId = generateCopySuffix();
	return `${originalLabel}-copy-${shortId}`;
}

function processNode(node: Node): Node {
	if (node.type.name === 'table_wrapper' && node.attrs.label) {
		const newContent = processFragment(node.content);
		return node.type.create({ ...node.attrs, label: generateCopyLabel(node.attrs.label) }, newContent, node.marks);
	}

	if (node.type.name === 'image' && node.attrs.label) {
		const newContent = processFragment(node.content);
		return node.type.create({ ...node.attrs, label: generateCopyLabel(node.attrs.label) }, newContent, node.marks);
	}

	if (node.type.name === 'block_math' && node.attrs.label) {
		const newContent = processFragment(node.content);
		return node.type.create({ ...node.attrs, label: generateCopyLabel(node.attrs.label) }, newContent, node.marks);
	}

	if (node.content.size > 0) {
		const newContent = processFragment(node.content);
		return node.type.create(node.attrs, newContent, node.marks);
	}

	return node;
}

function processFragment(fragment: Fragment): Fragment {
	const nodes: Node[] = [];

	fragment.forEach((node) => {
		nodes.push(processNode(node));
	});

	return Fragment.from(nodes);
}

function regenerateTableUUIDs(slice: Slice): Slice {
	const newContent = processFragment(slice.content);
	return new Slice(newContent, slice.openStart, slice.openEnd);
}

export const pasteUUIDFixPlugin = new Plugin({
	props: {
		// returning true skips default paste handling AND transformPasted
		handlePaste(view, event, slice) {
			const modifiedSlice = regenerateTableUUIDs(slice);
			const tr = view.state.tr.replaceSelection(modifiedSlice);
			view.dispatch(tr);
			return true;
		},

		// only reached for drag-drop; leave labels alone so reordering doesn't rename them
		transformPasted(slice) {
			return slice;
		}
	}
});
