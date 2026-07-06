// highlights nodes carrying a suggestion attr via Decoration.node, so individual
// NodeViews/toDOM don't need to know about suggestions
import { Plugin } from 'prosemirror-state';
import type { EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export function suggestionNodeDecoPlugin(): Plugin {
	return new Plugin({
		props: {
			decorations(state: EditorState) {
				const decos: Decoration[] = [];
				state.doc.descendants((node, pos) => {
					const sugg = node.attrs.suggestion;
					if (sugg?.type === 'insert') {
						decos.push(
							Decoration.node(pos, pos + node.nodeSize, {
								class: 'suggestion-node-insert'
							})
						);
					} else if (sugg?.type === 'delete') {
						decos.push(
							Decoration.node(pos, pos + node.nodeSize, {
								class: 'suggestion-node-delete'
							})
						);
					}
				});
				return decos.length ? DecorationSet.create(state.doc, decos) : DecorationSet.empty;
			}
		}
	});
}
