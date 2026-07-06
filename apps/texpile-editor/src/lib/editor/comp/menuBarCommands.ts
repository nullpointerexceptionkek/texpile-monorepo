// menu-bar editor commands. visual mode always targets the PM doc (a raw CM block is still a
// PM node); only source mode targets the SourceEditor's CodeMirror.
import { get } from 'svelte/store';
import { EditorView as CMView } from '@codemirror/view';
import { undo, redo } from 'prosemirror-history';
import { toggleMark } from 'prosemirror-commands';
import { toggleHeading, toggleBlockQuote } from '$lib/editor/helperCommands';
import { schema } from '$lib/schema/schema';
import { editorViewStore, displaySearchBarStore, viewMode, sourceCmView } from '$lib/stores/editorStore';
import type { Command, EditorState } from 'prosemirror-state';
import type { Node as PMNode } from 'prosemirror-model';

/** runs a PM command against the main editor, then refocuses it. */
export function run(cmd: Command) {
	const v = get(editorViewStore);
	if (!v) return;
	cmd(v.state, v.dispatch);
	v.focus();
}

/** replaces the selection in the main editor with a freshly built node. */
export function insertNode(make: (state: EditorState) => PMNode | null) {
	const v = get(editorViewStore);
	if (!v) return;
	const node = make(v.state);
	if (node) {
		v.dispatch(v.state.tr.replaceSelectionWith(node));
		v.focus();
	}
}

/** the CM view the menu should target: source mode only, null in visual mode. */
export function activeCm(): CMView | null {
	if (get(viewMode) !== 'source') return null;
	const cm = get(sourceCmView);
	return cm && cm.dom.isConnected ? cm : null;
}

/** wraps the CM selection with before/after (or inserts at the cursor), then refocuses. */
export function cmReplace(cm: CMView, before: string, after = '') {
	const { from, to } = cm.state.selection.main;
	const sel = cm.state.sliceDoc(from, to);
	cm.dispatch({
		changes: { from, to, insert: before + sel + after },
		selection: { anchor: from + before.length, head: from + before.length + sel.length },
		scrollIntoView: true
	});
	cm.focus();
}

export function editSelect(value: string) {
	if (value === 'undo') run(undo);
	else if (value === 'redo') run(redo);
	else if (value === 'find') displaySearchBarStore.update((v) => !v);
}

export function formatSelect(value: string) {
	const cm = activeCm();
	if (cm) {
		const wrap: Record<string, [string, string]> = {
			bold: ['\\textbf{', '}'],
			italic: ['\\textit{', '}'],
			underline: ['\\underline{', '}'],
			code: ['\\texttt{', '}'],
			h1: ['\\section{', '}'],
			h2: ['\\subsection{', '}'],
			h3: ['\\subsubsection{', '}'],
			quote: ['\\begin{quote}\n', '\n\\end{quote}']
		};
		if (wrap[value]) cmReplace(cm, wrap[value][0], wrap[value][1]);
		return;
	}
	switch (value) {
		case 'bold':
			run(toggleMark(schema.marks.strong));
			break;
		case 'italic':
			run(toggleMark(schema.marks.em));
			break;
		case 'underline':
			run(toggleMark(schema.marks.u));
			break;
		case 'code':
			run(toggleMark(schema.marks.code));
			break;
		case 'h1':
			run(toggleHeading(1));
			break;
		case 'h2':
			run(toggleHeading(2));
			break;
		case 'h3':
			run(toggleHeading(3));
			break;
		case 'quote':
			run(toggleBlockQuote());
			break;
	}
}
