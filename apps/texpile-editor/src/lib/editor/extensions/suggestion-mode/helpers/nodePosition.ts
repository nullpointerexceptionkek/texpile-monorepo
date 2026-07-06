import type { ResolvedPos } from 'prosemirror-model';

/** climbs up from a block-start position to one usable for re-inserting removed text before the block. */
export const findNonStartingPos = ($pos: ResolvedPos): number => {
	if ($pos.parentOffset !== 0) {
		return $pos.pos;
	}

	let depth = $pos.depth;
	let position = $pos.pos;

	while (depth > 0) {
		const node = $pos.node(depth);
		// prosemirror-flat-list uses a single `list` node type
		if (node.type.name === 'list') {
			position = $pos.before(depth);
			depth--;
		} else {
			break;
		}
	}

	return position;
};
