import { snippet } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

/**
 * Insert a CodeMirror snippet at the cursor from a toolbar popover, and leave the editor genuinely
 * focused.
 *
 * The focus dance matters: zag closes the popover by refocusing its trigger on the next animation
 * frame (setFinalFocus), which lands AFTER a synchronous view.focus() and silently steals it back.
 * CodeMirror still paints the caret, so it looks focused while every keybinding goes nowhere.
 * Focusing on the frame after zag's wins the race — our first rAF is queued before zag's, so the
 * nested one is the last word.
 */
export function insertSnippetAtCursor(view: EditorView, template: string): void {
	const { from, to } = view.state.selection.main;
	snippet(template)(view, null, from, to);
	requestAnimationFrame(() => requestAnimationFrame(() => view.focus()));
}
