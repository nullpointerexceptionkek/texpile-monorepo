// generic "known argument slot -> known values" completion (LaTeX Workshop's keyPos/keys
// mechanism, scaled to a small hand-maintained table instead of ~250 CTAN package files — see
// data/argKeys.ts for why). Each rule below is just a regex + a value list; add a rule instead
// of building a position-tracking engine when the trigger shape is this small and regular.
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { ARG_KEY_RULES, USEPACKAGE_OPTION_KEYS } from '../data/argKeys';
import { INPUT_ENCODINGS, FONT_ENCODINGS } from '../data/encodings';
import { COLOR_NAMES } from '../data/colornames';
import { BIB_STYLES } from '../data/bibstyles';
import { lastListToken } from './shared';

const COLOR_TRIGGERS: RegExp[] = [
	/\\(?:textcolor|color|pagecolor|normalcolor)\*?\{[^{}]*$/,
	/\\colorbox\*?\{[^{}]*$/,
	/\\fcolorbox\*?\{[^{}]*\}\{[^{}]*$/,
	/\\fcolorbox\*?\{[^{}]*$/
];

const BIBSTYLE_TRIGGER = /\\(?:bibliographystyle|citestyle)\{[^{}]*$/;
const USEPACKAGE_OPTIONS_TRIGGER = /\\usepackage\[[^\]]*$/;
// the package name a \usepackage[...]{name} line resolves to, wherever the cursor sits inside it
const USEPACKAGE_NAME_ON_LINE = /\\usepackage(?:\[[^\]]*\])?\{([^{}]+)\}/;

// "key=" entries insert with the cursor right after "=", ready for the value (CodeMirror's
// default apply already places the cursor at the end of the inserted label).
function toCompletion(value: string): Completion {
	return { label: value, type: 'constant' };
}

function tryPackageIndependentRules(ctx: CompletionContext): CompletionResult | null {
	for (const rule of ARG_KEY_RULES) {
		const match = ctx.matchBefore(rule.trigger);
		if (match) return lastListToken(match, rule.options.map(toCompletion));
	}
	return null;
}

// \usepackage[...]{pkgname}'s options depend on pkgname, which may be typed AFTER the cursor
// (options come first) — matchBefore only sees text before the cursor, so the package name is
// read from the whole line instead of folded into the trigger regex.
function tryUsepackageOptions(ctx: CompletionContext): CompletionResult | null {
	const match = ctx.matchBefore(USEPACKAGE_OPTIONS_TRIGGER);
	if (!match) return null;
	const line = ctx.state.doc.lineAt(ctx.pos).text;
	const pkg = USEPACKAGE_NAME_ON_LINE.exec(line)?.[1];
	if (!pkg) return null;
	const options = pkg === 'inputenc' ? INPUT_ENCODINGS : pkg === 'fontenc' ? FONT_ENCODINGS : USEPACKAGE_OPTION_KEYS[pkg];
	if (!options?.length) return null;
	return lastListToken(match, options.map(toCompletion));
}

export function argumentCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const packageIndependent = tryPackageIndependentRules(ctx);
	if (packageIndependent) return packageIndependent;

	const usepackageOptions = tryUsepackageOptions(ctx);
	if (usepackageOptions) return usepackageOptions;

	// colors: \textcolor{…}, \color{…}, \colorbox{…}, \fcolorbox{…}{…}
	for (const trigger of COLOR_TRIGGERS) {
		const match = ctx.matchBefore(trigger);
		if (match) return lastListToken(match, COLOR_NAMES.map(toCompletion));
	}

	const bibstyle = ctx.matchBefore(BIBSTYLE_TRIGGER);
	if (bibstyle) return lastListToken(bibstyle, BIB_STYLES.map(toCompletion));

	return null;
}
