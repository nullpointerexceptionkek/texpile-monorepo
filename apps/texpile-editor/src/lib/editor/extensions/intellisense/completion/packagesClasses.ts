// \usepackage{...} and \documentclass{...} name completion, from the curated lists in data/.
// only reachable in Source mode (that's where the preamble is actually edited, see
// SourceEditor.svelte's texSource binding — the visual/WYSIWYG editor never touches the preamble).
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { CLASS_NAMES } from '../data/classnames';
import { PACKAGE_NAMES } from '../data/packagenames';

const CLASS_OPTIONS: Completion[] = CLASS_NAMES.map((c) => ({ label: c.name, type: 'class', detail: c.detail }));
const PACKAGE_OPTIONS: Completion[] = PACKAGE_NAMES.map((p) => ({ label: p.name, type: 'module', detail: p.detail }));

const DOCUMENTCLASS_NAME = /\\documentclass(?:\[[^\]]*\])?\{([a-zA-Z0-9,-]*)$/;
const USEPACKAGE_NAME = /\\(?:usepackage|RequirePackage)(?:\[[^\]]*\])?\{([a-zA-Z0-9,-]*)$/;

export function packageClassCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const cls = ctx.matchBefore(DOCUMENTCLASS_NAME);
	if (cls) {
		const from = cls.from + cls.text.lastIndexOf('{') + 1;
		return { from, options: CLASS_OPTIONS, validFor: /^[a-zA-Z0-9-]*$/ };
	}
	const pkg = ctx.matchBefore(USEPACKAGE_NAME);
	if (pkg) {
		// \usepackage{a,b,c} allows a comma list; complete only the last name being typed
		const sepAt = Math.max(pkg.text.lastIndexOf('{'), pkg.text.lastIndexOf(','));
		const from = pkg.from + sepAt + 1;
		return { from, options: PACKAGE_OPTIONS, validFor: /^[a-zA-Z0-9-]*$/ };
	}
	return null;
}
