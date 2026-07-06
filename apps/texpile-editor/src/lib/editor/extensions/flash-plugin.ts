// transient "you are here" flash for mode-switch scroll sync. a plain classList.add gets
// wiped on every PM redraw, so the class has to go through a node decoration.
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';

const flashKey = new PluginKey<DecorationSet>('node-flash');

export function createNodeFlashPlugin() {
	return new Plugin<DecorationSet>({
		key: flashKey,
		state: {
			init: () => DecorationSet.empty,
			apply(tr, set) {
				const meta = tr.getMeta(flashKey) as { add?: number; clear?: boolean } | undefined;
				if (meta?.clear) return DecorationSet.empty;
				if (meta && typeof meta.add === 'number') {
					const node = tr.doc.nodeAt(meta.add);
					if (node) {
						return DecorationSet.create(tr.doc, [Decoration.node(meta.add, meta.add + node.nodeSize, { class: 'mode-sync-flash' })]);
					}
					return DecorationSet.empty;
				}
				return set.map(tr.mapping, tr.doc);
			}
		},
		props: {
			decorations(state) {
				return flashKey.getState(state);
			}
		}
	});
}

/** Flash the block at `pos` for `ms` (default matches the 1.4s synctex-flash animation). */
export function flashNodeAt(view: EditorView, pos: number, ms = 1500): void {
	view.dispatch(view.state.tr.setMeta(flashKey, { add: pos }).setMeta('addToHistory', false));
	setTimeout(() => {
		if (view.isDestroyed) return;
		view.dispatch(view.state.tr.setMeta(flashKey, { clear: true }).setMeta('addToHistory', false));
	}, ms);
}
