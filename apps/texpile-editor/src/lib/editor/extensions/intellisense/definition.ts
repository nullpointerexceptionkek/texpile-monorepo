// go-to-definition: F12 jumps from a \ref{…}/\label usage or a user-macro invocation to where
// it's defined. Same-buffer only for now — \input/\include targets live in another file, which
// would need SourceEditor's caller to actually open that file; onJumpToFile is a hook for that,
// left unwired until Source mode's file-switching is threaded through here.
import { keymap, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { flashLineEffect } from '$lib/editor/extensions/synctex-flash/synctexFlash';
import { tokenAt, findLabelOffset } from './hover';

const INCLUDE_TRIGGER = /\\(?:input|include|subfile|subfileinclude)\{([^{}]+)\}/g;

export function findMacroDefinition(text: string, name: string): number | null {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(
		`\\\\(?:new|renew|provide)command\\*?\\s*\\{?\\\\${escaped}\\}?|` +
			`\\\\(?:New|Renew|Provide)(?:Expandable)?DocumentCommand\\s*\\{\\\\${escaped}\\}`
	);
	const idx = text.search(re);
	return idx < 0 ? null : idx;
}

export function includeTargetAt(lineText: string, lineStart: number, pos: number): string | null {
	for (const m of lineText.matchAll(INCLUDE_TRIGGER)) {
		const groupStart = lineStart + (m.index ?? 0) + m[0].indexOf(m[1]);
		const groupEnd = groupStart + m[1].length;
		if (pos >= groupStart && pos <= groupEnd) return m[1];
	}
	return null;
}

function jumpTo(view: EditorView, offset: number): void {
	view.dispatch({ selection: { anchor: offset }, scrollIntoView: true, effects: flashLineEffect.of(offset) });
	view.focus();
}

/** F12 "go to definition" for labels and user-defined macros within the same buffer. */
export function goToDefinition(onJumpToFile?: (name: string) => void): Extension {
	return keymap.of([
		{
			key: 'F12',
			run(view) {
				const pos = view.state.selection.main.head;
				const line = view.state.doc.lineAt(pos);
				const text = view.state.doc.toString();

				const includeTarget = includeTargetAt(line.text, line.from, pos);
				if (includeTarget) {
					onJumpToFile?.(includeTarget);
					return true;
				}

				const token = tokenAt(line.text, line.from, pos);
				if (token?.kind === 'label') {
					const offset = findLabelOffset(text, token.value);
					if (offset != null) {
						jumpTo(view, offset);
						return true;
					}
				}
				if (token?.kind === 'macro') {
					const offset = findMacroDefinition(text, token.value);
					if (offset != null) {
						jumpTo(view, offset);
						return true;
					}
				}
				return false;
			}
		}
	]);
}
