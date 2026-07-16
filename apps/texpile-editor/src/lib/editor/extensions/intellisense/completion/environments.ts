// environment name completion inside \begin{…}/\end{…}, plus two LaTeX-Workshop-style extras:
// "ForBegin" (accepting a fresh \begin{name} immediately builds the whole block + matching \end)
// and close-environment (finishing \begin{name} by hand offers the matching \end{name} next).
import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { environmentInfo } from '@unified-latex/unified-latex-ctan';
import { renderSignature } from './shared';
import { withFrecency } from './frecency';

type InfoMap = Record<string, Record<string, { signature?: string }>>;

function collectSignatures(info: InfoMap, extra: Record<string, string> = {}): Map<string, string> {
	const out = new Map<string, string>();
	for (const pkg of Object.values(info))
		for (const [name, def] of Object.entries(pkg)) if (!out.has(name)) out.set(name, def.signature ?? '');
	for (const [name, sig] of Object.entries(extra)) if (!out.has(name)) out.set(name, sig);
	return out;
}

const EXTRA_ENVS: Record<string, string> = {
	align: '',
	'align*': '',
	gather: '',
	'gather*': '',
	multline: '',
	'multline*': '',
	cases: '',
	equation: '',
	'equation*': '',
	matrix: '',
	pmatrix: '',
	bmatrix: '',
	// LaTeX Workshop's default environment list beyond the CTAN DB
	subarray: '',
	eqnarray: '',
	subequations: '',
	'subequations*': '',
	gathered: '',
	alignedat: '',
	xalignat: '',
	'xalignat*': '',
	center: '',
	flushleft: '',
	flushright: '',
	quotation: '',
	quote: '',
	verbatim: '',
	verse: '',
	titlepage: ''
};

// LW body snippets: list envs start with their first \item instead of an empty line
const ENV_BODY: Record<string, string> = {
	itemize: '\n\t\\item ${0}',
	enumerate: '\n\t\\item ${0}',
	description: '\n\t\\item[${1}] ${0}'
};

const ENV_SIGNATURE_MAP = collectSignatures(environmentInfo as InfoMap, EXTRA_ENVS);
const ENV_NAMES = [...ENV_SIGNATURE_MAP.keys()].sort((a, b) => a.localeCompare(b));

/** plain name completion, used for \end{…} and mid-edit \begin{…} (content already follows). */
const AS_NAME_OPTIONS: Completion[] = ENV_NAMES.map((name) => ({
	label: name,
	type: 'class',
	detail: renderSignature(ENV_SIGNATURE_MAP.get(name) ?? '')
}));

/** accepting this immediately builds \begin{name}\n\t$0\n\end{name} — used for a fresh \begin{. */
const FOR_BEGIN_OPTIONS: Completion[] = ENV_NAMES.map((name) =>
	snippetCompletion(`${name}}${ENV_BODY[name] ?? '\n\t${0}'}\n\\end{${name}}`, {
		label: name,
		type: 'class',
		detail: renderSignature(ENV_SIGNATURE_MAP.get(name) ?? '')
	})
);

const BEGIN_OR_END = /\\(begin|end)\{([a-zA-Z*]*)$/;
const BEGIN_CLOSED = /\\begin\{([a-zA-Z*]+)\}$/; // fires the instant the closing brace is typed by hand

export function environmentCompletionSource(ctx: CompletionContext): CompletionResult | null {
	const closed = ctx.matchBefore(BEGIN_CLOSED);
	if (closed) {
		const name = closed.text.slice('\\begin{'.length, -1);
		return {
			from: closed.to,
			options: [snippetCompletion('\n${0}\n\\end{' + name + '}', { label: `\\end{${name}}`, type: 'class' })],
			validFor: /^$/
		};
	}

	const match = ctx.matchBefore(BEGIN_OR_END);
	if (!match) return null;
	const from = match.from + match.text.indexOf('{') + 1;
	const isBegin = match.text.startsWith('\\begin');
	// "fresh" \begin{: nothing but the closing brace follows on this line, and no other content
	// already sits after the cursor — mid-edit renames (content already typed after) get the
	// plain name instead of duplicating a \end.
	const afterCursor = ctx.state.sliceDoc(ctx.pos, ctx.state.doc.lineAt(ctx.pos).to);
	const isFresh = isBegin && /^\*?\}?\s*$/.test(afterCursor);
	return { from, options: withFrecency(isFresh ? FOR_BEGIN_OPTIONS : AS_NAME_OPTIONS), validFor: /^[a-zA-Z*]*$/ };
}
