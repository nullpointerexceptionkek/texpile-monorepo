// keyboard-shortcut formatting commands for Source mode, mirroring LaTeX Workshop's
// toggleSelectedKeyword (accept/wrap OR unwrap a \keyword{...} call) but bound to the SAME chords
// Visual mode already uses (EditorView.svelte's Mod-b/i/u/`/./,/Shift-b/Shift-`/m/Shift-m), so
// muscle memory carries over between Source and Visual instead of copying LaTeX Workshop's own
// leader-key (Ctrl+L, Ctrl+B) scheme, which nothing else in this app uses.
import { keymap, type EditorView } from '@codemirror/view';
import type { EditorState, Extension, TransactionSpec } from '@codemirror/state';

/** finds the nearest \keyword{...} enclosing `pos`, if any (single level, no nested-\keyword lookup). */
function findEnclosingMacro(text: string, pos: number, keyword: string): { from: number; to: number; inner: string } | null {
	let depth = 0;
	let openBrace = -1;
	for (let i = pos - 1; i >= 0; i--) {
		const ch = text[i];
		if (ch === '}') depth++;
		else if (ch === '{') {
			if (depth === 0) {
				openBrace = i;
				break;
			}
			depth--;
		}
	}
	if (openBrace < 0) return null;
	const needle = '\\' + keyword;
	if (text.slice(Math.max(0, openBrace - needle.length), openBrace) !== needle) return null;
	const macroStart = openBrace - needle.length;
	let d = 0;
	for (let i = openBrace; i < text.length; i++) {
		if (text[i] === '{') d++;
		else if (text[i] === '}') {
			d--;
			if (d === 0) return { from: macroStart, to: i + 1, inner: text.slice(openBrace + 1, i) };
		}
	}
	return null;
}

/**
 * computes the toggle edit for \keyword{...} around each selection: wraps plain text, unwraps if
 * the selection (or, for an empty selection, the cursor) is already inside one. Pure function of
 * state so it's unit-testable without a DOM-backed EditorView; multi-cursor selections are
 * handled independently, right-to-left so earlier edits don't shift later offsets.
 */
export function computeToggleWrap(state: EditorState, keyword: string): TransactionSpec {
	const text = state.doc.toString();
	const ranges = [...state.selection.ranges].sort((a, b) => b.from - a.from);
	const changes: { from: number; to: number; insert: string }[] = [];
	let newSelectionPos: number | null = null;

	for (const range of ranges) {
		if (range.empty) {
			const enclosing = findEnclosingMacro(text, range.from, keyword);
			if (enclosing) {
				changes.push({ from: enclosing.from, to: enclosing.to, insert: enclosing.inner });
				newSelectionPos = enclosing.from + enclosing.inner.length;
			} else {
				const insert = `\\${keyword}{}`;
				changes.push({ from: range.from, to: range.from, insert });
				newSelectionPos = range.from + insert.length - 1; // land between the braces
			}
			continue;
		}
		const selected = text.slice(range.from, range.to);
		const opener = `\\${keyword}{`;
		if (selected.startsWith(opener) && selected.endsWith('}')) {
			const inner = selected.slice(opener.length, -1);
			changes.push({ from: range.from, to: range.to, insert: inner });
		} else {
			changes.push({ from: range.from, to: range.to, insert: `${opener}${selected}}` });
		}
	}

	return {
		changes,
		selection: ranges.length === 1 && newSelectionPos != null ? { anchor: newSelectionPos } : undefined,
		scrollIntoView: true
	};
}

function toggleWrapKeyword(view: EditorView, keyword: string): boolean {
	view.dispatch(computeToggleWrap(view.state, keyword));
	return true;
}

/** one-way wrap (no toggle-off): for block-level constructs where "unwrap" isn't well-defined. */
export function computeWrapBlock(state: EditorState, before: string, after: string): TransactionSpec {
	const { from, to } = state.selection.main;
	const selected = state.sliceDoc(from, to);
	return {
		changes: { from, to, insert: before + selected + after },
		selection: { anchor: from + before.length, head: from + before.length + selected.length },
		scrollIntoView: true
	};
}

function wrapBlock(view: EditorView, before: string, after: string): boolean {
	view.dispatch(computeWrapBlock(view.state, before, after));
	return true;
}

/** the Source-mode keymap: same chords as Visual mode's Mod-b/i/u/`/./,/Shift-b/Shift-`/m/Shift-m. */
export function formatShortcuts(): Extension {
	return keymap.of([
		{ key: 'Mod-b', run: (v) => toggleWrapKeyword(v, 'textbf') },
		{ key: 'Mod-i', run: (v) => toggleWrapKeyword(v, 'textit') },
		{ key: 'Mod-u', run: (v) => toggleWrapKeyword(v, 'underline') },
		{ key: 'Mod-`', run: (v) => toggleWrapKeyword(v, 'texttt') },
		{ key: 'Mod-.', run: (v) => toggleWrapKeyword(v, 'textsuperscript') },
		{ key: 'Mod-,', run: (v) => toggleWrapKeyword(v, 'textsubscript') },
		{ key: 'Mod-Shift-b', run: (v) => wrapBlock(v, '\\begin{quote}\n', '\n\\end{quote}') },
		{ key: 'Mod-Shift-`', run: (v) => wrapBlock(v, '\\begin{verbatim}\n', '\n\\end{verbatim}') },
		{ key: 'Mod-Alt-1', run: (v) => wrapBlock(v, '\\section{', '}') },
		{ key: 'Mod-Alt-2', run: (v) => wrapBlock(v, '\\subsection{', '}') },
		{ key: 'Mod-Alt-3', run: (v) => wrapBlock(v, '\\subsubsection{', '}') },
		{ key: 'Mod-m', run: (v) => wrapBlock(v, '\\(', '\\)') },
		{ key: 'Mod-Shift-m', run: (v) => wrapBlock(v, '\\[', '\\]') }
	]);
}
