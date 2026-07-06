// public entry point for the intellisense module: completion, keyboard shortcuts, hover, folding,
// and go-to-definition, composed for either a .tex buffer or a .bib buffer.
import { autocompletion } from '@codemirror/autocomplete';
import { tooltips } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { latexCompletionSource, bibFileCompletionSource } from './completion/dispatch';
import { formatShortcuts } from './shortcuts';
import { latexHover } from './hover';
import { latexFolding } from './fold';
import { goToDefinition } from './definition';

export { latexCompletionSource, bibFileCompletionSource };

interface IntellisenseOptions {
	/** popup escapes a node's own box; needed for completions/hover inside a raw/inline LaTeX chip. */
	tooltipsInBody?: boolean;
	/** .bib files get entry-type/field completion instead of the LaTeX macro/citation/ref dispatch. */
	bib?: boolean;
}

/** completion only — used inside the WYSIWYG editor's raw/inline LaTeX node views. */
export function latexAutocomplete(opts: IntellisenseOptions = {}): Extension {
	const source = opts.bib ? bibFileCompletionSource : latexCompletionSource;
	const ext: Extension[] = [autocompletion({ override: [source], activateOnTyping: true, icons: false })];
	if (opts.tooltipsInBody) ext.push(tooltips({ parent: document.body }));
	return ext;
}

/** completion + shortcuts + hover + folding + go-to-definition, for the full Source-mode editor. */
export function latexIntellisense(opts: IntellisenseOptions & { onJumpToFile?: (name: string) => void } = {}): Extension {
	const ext: Extension[] = [latexAutocomplete(opts)];
	if (!opts.bib) {
		ext.push(formatShortcuts(), latexHover(), latexFolding(), goToDefinition(opts.onJumpToFile));
	}
	return ext;
}
