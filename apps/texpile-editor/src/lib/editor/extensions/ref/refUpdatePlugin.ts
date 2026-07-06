import { Plugin } from 'prosemirror-state';
import { triggerRefUpdate } from './refUpdateStore';

// watches table positions and pokes ref displays when tables are added, removed, or reordered
export function createRefUpdatePlugin() {
	let lastTablePositions: number[] = [];

	return new Plugin({
		state: {
			init(_, state) {
				const positions: number[] = [];
				state.doc.descendants((node, pos) => {
					if (node.type.name === 'table_wrapper') {
						positions.push(pos);
					}
				});
				lastTablePositions = positions;
				return null;
			},
			apply(tr, value, oldState, newState) {
				if (!tr.docChanged) {
					return null;
				}

				const newTablePositions: number[] = [];
				newState.doc.descendants((node, pos) => {
					if (node.type.name === 'table_wrapper') {
						newTablePositions.push(pos);
					}
				});

				const countChanged = lastTablePositions.length !== newTablePositions.length;
				const positionsChanged = !countChanged && lastTablePositions.some((pos, i) => pos !== newTablePositions[i]);

				if (countChanged || positionsChanged) {
					lastTablePositions = newTablePositions;
					triggerRefUpdate();
				}

				return null;
			}
		}
	});
}
