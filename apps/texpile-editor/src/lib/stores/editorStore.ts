import { writable } from 'svelte/store';
import type { EditorView } from 'prosemirror-view';
import type { EditorView as CodeMirrorView } from '@codemirror/view';
import type { BibLaTeXReference } from '$lib/biblatex';
import type { EditorConfiguration } from '$lib/types/editorcfg';

export const editorViewStore = writable<EditorView>(null);
export const displaySearchBarStore = writable(false);
// true while a raw-LaTeX CodeMirror block inside the visual editor has focus;
// the toolbar swaps to a raw-LaTeX bar (see Toolbar.svelte)
export const rawEditorActiveStore = writable(false);
// routes Insert/Format in menuBarCommands. visual mode always targets the PM doc (a raw CM block
// is still a PM node, inserting LaTeX text into it would get re-parsed away); only source mode
// targets a CodeMirror editor.
export const viewMode = writable<'visual' | 'source'>('visual');
// the SourceEditor's CodeMirror view while source mode is active; used by Insert/Format
export const sourceCmView = writable<CodeMirrorView | null>(null);
// true when the PM selection is inside a CodeMirror-backed block; the menu bar disables
// Insert/Format there (they would split/convert the block). maintained by createCursorPlugin.
export const cursorInCm = writable<boolean>(false);
export const referenceStore = writable<BibLaTeXReference[]>(null);
// all \label{} keys in the current file, consumed by \ref/\eqref/\cref autocompletion
export const labelStore = writable<string[]>([]);
// workspace files as root-relative forward-slash paths, consumed by file-path autocompletion
export const filePathStore = writable<string[]>([]);
export const editorConfigStore = writable<EditorConfiguration>(null);

interface CitationVariant {
	value: string; // e.g. "cite", "autocite", "parencite"
	label: string; // e.g. "Numbered", "Parenthetical"
	desc: string; // e.g. "[1], [2]", "(Author Year)"
}

export interface TemplateFeatures {
	citations: boolean;
	tableCaption: boolean;
	tableNotes: boolean;
	tableHeaderRow?: boolean; // false hides the "Column headers (first row)" toggle
	tableHeaderColumn?: boolean; // false hides the "Row labels (first column)" toggle
	columnSpanningFigures: boolean; // true shows the "Span columns" toggle for figures/tables
	citationVariants?: CitationVariant[]; // undefined = default biblatex options
	highlight?: boolean; // false: highlight won't appear in the final document (user sees warning)
	textColor?: boolean; // false: text color won't appear in the final document (user sees warning)
}

const DEFAULT_TEMPLATE_FEATURES: TemplateFeatures = {
	citations: true,
	tableCaption: true,
	tableNotes: true,
	tableHeaderRow: true,
	tableHeaderColumn: true,
	columnSpanningFigures: false,
	highlight: true,
	textColor: true
	// citationVariants omitted = default biblatex options
};

export const templateFeaturesStore = writable<TemplateFeatures>(DEFAULT_TEMPLATE_FEATURES);
