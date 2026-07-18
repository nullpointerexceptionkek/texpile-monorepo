// public entry point for the intellisense module: completion, keyboard shortcuts, hover, folding,
// and go-to-definition, composed for either a .tex buffer or a .bib buffer.
import { autocompletion, completionStatus, startCompletion } from '@codemirror/autocomplete';
import { EditorView, tooltips } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { latexCompletionSource, bibFileCompletionSource } from './completion/dispatch';
import { frecencyTracker } from './completion/frecency';
import { formatShortcuts } from './shortcuts';
import { latexHover } from './hover';
import { latexFolding } from './fold';
import { goToDefinition, type DefinitionHooks } from './definition';

export { latexCompletionSource, bibFileCompletionSource };

interface IntellisenseOptions {
	/** popup escapes a node's own box; needed for completions/hover inside a raw/inline LaTeX chip. */
	tooltipsInBody?: boolean;
	/** .bib files get entry-type/field completion instead of the LaTeX macro/citation/ref dispatch. */
	bib?: boolean;
}

// CodeMirror re-queries completion only on INSERTED text; deletions never reactivate it. This to repair it
const reactivate = EditorView.updateListener.of((update) => {
	if (completionStatus(update.state) !== null) return; // active session: CM manages it
	if (update.docChanged && update.transactions.some((tr) => tr.isUserEvent('delete'))) startCompletion(update.view);
});

/** completion only — used inside the WYSIWYG editor's raw/inline LaTeX node views. */
export function latexAutocomplete(opts: IntellisenseOptions = {}): Extension {
	const source = opts.bib ? bibFileCompletionSource : latexCompletionSource;
	const ext: Extension[] = [autocompletion({ override: [source], activateOnTyping: true, icons: false }), reactivate, frecencyTracker()];
	if (opts.tooltipsInBody) ext.push(tooltips({ parent: document.body }));
	return ext;
}

/** completion + shortcuts + hover + folding + go-to-definition, for the full Source-mode editor. */
export function latexIntellisense(opts: IntellisenseOptions & DefinitionHooks = {}): Extension {
	const ext: Extension[] = [latexAutocomplete(opts)];
	if (!opts.bib) {
		ext.push(
			formatShortcuts(),
			latexHover(),
			latexFolding(),
			goToDefinition({ onJumpToFile: opts.onJumpToFile, onOpenFileAt: opts.onOpenFileAt })
		);
	}
	return ext;
}
