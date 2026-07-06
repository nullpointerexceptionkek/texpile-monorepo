import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const key = new PluginKey<boolean>('persistentSelection');

// browsers hide the caret of an unfocused editor, so draw a fake one while focus is parked in a
// transient overlay ([data-scope] menus/dialogs, or anything with [data-keep-caret]). re-evaluated
// on every focusin so it disappears the moment focus genuinely leaves the editor's chrome.
export function createPersistentSelectionPlugin() {
	return new Plugin<boolean>({
		key,
		state: {
			init: () => false,
			apply(tr, show) {
				const meta = tr.getMeta(key);
				return typeof meta === 'boolean' ? meta : show;
			}
		},
		view(view) {
			const evaluate = () => {
				const active = document.activeElement as HTMLElement | null;
				const inEditor = !!active && view.dom.contains(active);
				const inOverlay = !!active && !!active.closest('[data-scope], [data-keep-caret]');
				const show = !inEditor && inOverlay; // only the "menu/dialog is open" case
				if (key.getState(view.state) !== show) view.dispatch(view.state.tr.setMeta(key, show));
			};
			const onFocusIn = () => evaluate();
			const onWindowBlur = () => {
				if (key.getState(view.state)) view.dispatch(view.state.tr.setMeta(key, false));
			};
			// failsafe: if the user types a printable char while the fake caret shows and focus is on
			// something non-editable, redirect the keystroke into PM. non-text keys stay with the menu
			// so keyboard nav still works.
			const onKeyDown = (e: KeyboardEvent) => {
				if (!key.getState(view.state)) return;
				if (e.ctrlKey || e.metaKey || e.altKey) return; // accelerators / shortcuts
				if (e.key.length !== 1 || e.key === ' ') return; // only single printable chars, skip space
				const active = document.activeElement as HTMLElement | null;
				if (!active) return;
				if (view.dom.contains(active)) return;
				// real editable fields elsewhere keep the keystroke
				if (active.matches('input, textarea, [contenteditable="true"]')) return;
				if (active.tagName === 'MATH-FIELD') return; // mathlive's <math-field>
				// preventDefault stops any menu button's default action; insert the char ourselves
				e.preventDefault();
				view.focus();
				view.dispatch(view.state.tr.insertText(e.key));
			};
			document.addEventListener('focusin', onFocusIn, true);
			document.addEventListener('keydown', onKeyDown, true);
			window.addEventListener('blur', onWindowBlur);
			return {
				destroy() {
					document.removeEventListener('focusin', onFocusIn, true);
					document.removeEventListener('keydown', onKeyDown, true);
					window.removeEventListener('blur', onWindowBlur);
				}
			};
		},
		props: {
			decorations(state) {
				if (!key.getState(state)) return null;
				const sel = state.selection;
				if (sel.empty) {
					// use <sup>/<sub> for pending sup/sub marks so the fake caret sits where the real
					// one would; browsers style those natively so the ::before inherits it for free
					const marks = state.storedMarks ?? sel.$from.marks();
					const tag = marks.some((m) => m.type.name === 'sup') ? 'sup' : marks.some((m) => m.type.name === 'sub') ? 'sub' : 'span';
					const widget = Decoration.widget(
						sel.head,
						() => {
							const el = document.createElement(tag);
							el.className = 'pm-blur-cursor';
							return el;
						},
						// tag in the key so PM rebuilds the widget when the pending mark changes
						{ side: 0, key: `pm-blur-cursor:${tag}` }
					);
					return DecorationSet.create(state.doc, [widget]);
				}
				return DecorationSet.create(state.doc, [Decoration.inline(sel.from, sel.to, { class: 'pm-blur-selection' })]);
			}
		}
	});
}
