// the ordered completion dispatch, mirroring LaTeX Workshop's own priority list: more specific
// contexts (citation/reference/environment/package/file-path) must all get a chance to match
// before the bare "\" + letters macro trigger, which would otherwise swallow everything after it.
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { citationCompletionSource } from './citations';
import { referenceCompletionSource } from './references';
import { environmentCompletionSource } from './environments';
import { packageClassCompletionSource } from './packagesClasses';
import { filePathCompletionSource } from './filePaths';
import { glossaryCompletionSource } from './glossary';
import { argumentCompletionSource } from './arguments';
import { macroOptions } from './macros';
import { subsuperscriptCompletionSource } from './subsuperscript';
import { atSuggestionCompletionSource } from './atSuggestions';
import { bibFileCompletionSource } from './bibFile';

const MACRO_TRIGGER = /\\[a-zA-Z]*$/;

// fires on the bare backslash too: LaTeX Workshop registers "\" as a trigger character
function macroCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const macro = ctx.matchBefore(MACRO_TRIGGER);
	if (macro) {
		return { from: macro.from, options: macroOptions(ctx.state.doc.toString()), validFor: /^\\[a-zA-Z]*$/ };
	}
	return null;
}

const TEX_SOURCES = [
	citationCompletionSource,
	referenceCompletionSource,
	environmentCompletionSource,
	packageClassCompletionSource,
	filePathCompletionSource,
	glossaryCompletionSource,
	argumentCompletionSource,
	atSuggestionCompletionSource,
	macroCompletionSource, // must run near-last: "\" + letters matches almost everything above too
	subsuperscriptCompletionSource
];

/** the full LaTeX (.tex/.cls/.sty) completion dispatch. */
export function latexCompletionSource(ctx: CompletionContext): CompletionResult | null {
	for (const source of TEX_SOURCES) {
		const result = source(ctx);
		if (result) return result;
	}
	return null;
}

/** .bib-file completion dispatch (entry types, optional fields, reused field values). */
export { bibFileCompletionSource };
