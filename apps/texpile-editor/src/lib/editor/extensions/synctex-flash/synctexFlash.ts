// briefly highlights the line the editor jumped to after synctex inverse search. dispatch
// flashLineEffect.of(pos) in the same transaction that moves the selection; the decoration
// self-cleans once its CSS animation finishes. same amber as the PDF forward-search highlight.
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

/** flash the line containing this document position; null clears any current flash. */
export const flashLineEffect = StateEffect.define<number | null>();

/** keep in sync with the synctex-flash CSS animation duration in app.css. */
const FLASH_MS = 1400;

const lineDeco = Decoration.line({ class: 'cm-synctex-flash' });

const flashField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(deco, tr) {
		deco = deco.map(tr.changes);
		for (const e of tr.effects) {
			if (e.is(flashLineEffect)) {
				deco = e.value == null ? Decoration.none : Decoration.set([lineDeco.range(tr.state.doc.lineAt(e.value).from)]);
			}
		}
		return deco;
	},
	provide: (f) => EditorView.decorations.from(f)
});

// clears the flash once its CSS animation has played out
const flashClearer = ViewPlugin.fromClass(
	class {
		private timer: ReturnType<typeof setTimeout> | null = null;
		constructor(private readonly view: EditorView) {}
		update(u: ViewUpdate) {
			for (const tr of u.transactions) {
				for (const e of tr.effects) {
					if (e.is(flashLineEffect) && e.value != null) {
						if (this.timer) clearTimeout(this.timer);
						this.timer = setTimeout(() => this.view.dispatch({ effects: flashLineEffect.of(null) }), FLASH_MS);
					}
				}
			}
		}
		destroy() {
			if (this.timer) clearTimeout(this.timer);
		}
	}
);

export function synctexFlash(): Extension {
	return [flashField, flashClearer];
}
