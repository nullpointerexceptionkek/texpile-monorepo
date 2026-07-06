// best-effort guesses about custom commands the converter has no first-class knowledge of, kept
// separate from the deterministic config in macros.ts. each takes an isKnown(name) predicate from
// the converter so this module needn't import the handler table.
import type { Root, Node } from '@unified-latex/unified-latex-types';
import { isMathEnvironment, type RawStamped } from './ast-utils';
import { ignoredMacros, SCOPED_SWITCHES, RAW_WHOLESALE_ARG_MACROS } from './macros';

// the exact structural shape read/written by this file's polymorphic sibling walks; keeps real
// property types without narrowing by discriminant first.
type LooseNode = RawStamped<{
	type: string;
	content?: unknown;
	args?: { content: Node[] }[];
	position?: { start?: { offset?: number }; end?: { offset?: number } };
	sameline?: boolean;
	env?: string;
}>;

/**
 * Preserve a frontmatter-style call whose {...} argument groups are interleaved with sameline
 * comments (\setstudentinfo {a} % name ...) VERBATIM: stripSamelineComments would delete the
 * comments and the call would re-serialize collapsed onto one line. the exact span (from AST
 * source positions) is stashed on the macro as `_raw`; consumed siblings are spliced out so
 * they aren't emitted twice. fires ONLY when a comment is actually interleaved among an
 * UNKNOWN macro's groups; plain calls keep the normal signature/attachment path.
 */
export function heuristicMarkCommentedMacroCalls(nodes: Node[] | undefined, source: string, isKnown: (name: string) => boolean): void {
	if (!Array.isArray(nodes) || !source) return;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i] as LooseNode;
		// recurse into content and args, but NOT a RAW_WHOLESALE_ARG_MACROS macro's args: that
		// node is rebuilt by ONE printRaw call, so `_raw` set inside just deletes content from its
		// view. everything else's args genuinely get re-walked downstream (table cells, \caption),
		// so info set there IS honoured. see RAW_WHOLESALE_ARG_MACROS's comment.
		if (Array.isArray(node.content)) heuristicMarkCommentedMacroCalls(node.content as Node[], source, isKnown);
		const skipArgs = node.type === 'macro' && RAW_WHOLESALE_ARG_MACROS.has(node.content as string);
		if (!skipArgs && node.args) for (const a of node.args) heuristicMarkCommentedMacroCalls(a.content, source, isKnown);

		if (node.type !== 'macro' || (node.args && node.args.length) || !node.position) continue;
		const name = node.content as string;
		// regex is a lexical control-word test on an AST-isolated name (letters + @), never raw source.
		if (isKnown(name) || ignoredMacros.has(name) || SCOPED_SWITCHES.has(name) || !/^[a-zA-Z@]+$/.test(name)) continue;

		// walk the trailing run of whitespace / sameline-comments / groups (the call's arguments),
		// stopping at anything else (a parbreak, the next macro, prose).
		let j = i + 1;
		let groups = 0;
		let sawComment = false;
		let lastEnd = node.position.end?.offset ?? -1;
		for (; j < nodes.length; j++) {
			const nx = nodes[j] as LooseNode;
			if (nx.type === 'whitespace') continue;
			if (nx.type === 'comment' && nx.sameline) {
				sawComment = true;
				if (nx.position?.end) lastEnd = nx.position.end.offset;
				continue;
			}
			if (nx.type === 'group') {
				groups++;
				if (nx.position?.end) lastEnd = nx.position.end.offset;
				continue;
			}
			break;
		}
		const start = node.position.start?.offset ?? -1;
		if (groups >= 1 && sawComment && start >= 0 && lastEnd > start) {
			const text = source.slice(start, lastEnd);
			// if the span ends inside a % comment, bake in a newline: a dangling comment marker
			// would eat whatever the serializer puts next on that line and compound every save.
			// (lexical tail check: comments don't nest or span lines.)
			node._raw = /(^|[^\\])%[^\n]*$/.test(text) ? text + '\n' : text;
			nodes.splice(i + 1, j - (i + 1)); // drop the consumed run; the span lives on `_raw` now
		}
	}
}

const DEF_LIKE_PRIMITIVES = new Set(['def', 'edef', 'gdef', 'xdef']);
const LET_LIKE_PRIMITIVES = new Set(['let', 'futurelet']);

/**
 * \def/\edef/\gdef/\xdef and \let/\futurelet are TeX primitives whose true syntax MACRO_SIGNATURES
 * cannot express (\def's parameter text is arbitrary undelimited tokens, \let's target/source are
 * bare csnames). unregistered, the definition's parts become independent SIBLING nodes: the
 * primitive is dropped (ignoredMacros) while # gets escaped and the body's braces get stripped,
 * turning a working definition into something pdflatex can't compile. so capture the WHOLE
 * construct's exact source span verbatim and splice out the consumed siblings.
 */
export function heuristicMarkTeXPrimitiveDefs(nodes: Node[] | undefined, source: string, pairsOut?: Map<string, string>): void {
	if (!Array.isArray(nodes) || !source) return;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i] as LooseNode;
		// recurse into CONTENT only, never macro args: an unknown macro's args are rebuilt by the
		// generic printRaw printer, which never reads `_raw`; splicing "consumed" siblings there
		// deletes content that was already round-tripping fine (a nested \edef collapsed to bare).
		if (Array.isArray(node.content)) heuristicMarkTeXPrimitiveDefs(node.content as Node[], source, pairsOut);

		if (node.type !== 'macro' || (node.args && node.args.length) || !node.position) continue;
		const name = node.content as string;
		const start: number | undefined = node.position.start?.offset;
		if (typeof start !== 'number') continue;

		if (DEF_LIKE_PRIMITIVES.has(name)) {
			// consume siblings up to and including the FIRST group (the body); bail at a parbreak
			// (a real \def never spans a blank line) rather than over-consume on an odd shape.
			let j = i + 1;
			let lastEnd = node.position.end?.offset ?? start;
			let sawGroup = false;
			for (; j < nodes.length; j++) {
				const nx = nodes[j] as LooseNode;
				if (nx.type === 'parbreak') break;
				if (nx.position?.end) lastEnd = nx.position.end.offset;
				if (nx.type === 'group') {
					sawGroup = true;
					j++;
					break;
				}
			}
			if (sawGroup) {
				// delimited-parameter shape \def\NAME #1...\DELIM {body}: record the pair for
				// heuristicMarkDelimitedMacroSpans. derived from AST tokens, NOT a source scan,
				// so a definition merely quoted inside verbatim/comment can never register.
				if (pairsOut) {
					const consumed = nodes.slice(i + 1, j) as LooseNode[]; // [..., DELIM?, body group]
					if (consumed.length >= 3) {
						const nameNode = consumed[0];
						const delimNode = consumed[consumed.length - 2];
						// lexical control-word test on AST-isolated names
						const isCs = (n: LooseNode | undefined) => n?.type === 'macro' && /^[a-zA-Z@]+$/.test(String(n.content ?? ''));
						// everything between NAME and DELIM must be pure #N parameter text; any
						// other token is a shape we don't understand, so record nothing. non-string
						// nodes map to a NUL sentinel so they fail the check instead of slipping by.
						const paramText = consumed
							.slice(1, consumed.length - 2)
							.map((m) => (m.type === 'string' ? String(m.content ?? '') : m.type === 'whitespace' ? ' ' : '\u0000'))
							.join('');
						if (isCs(nameNode) && isCs(delimNode) && /^(\s*#\d+)+\s*$/.test(paramText)) {
							pairsOut.set(String(nameNode.content), String(delimNode.content));
						}
					}
				}
				node._raw = source.slice(start, lastEnd);
				nodes.splice(i + 1, j - (i + 1));
			}
		} else if (LET_LIKE_PRIMITIVES.has(name)) {
			// \let<target><=?><source>: up to two csname "units", no whitespace assumed between
			// them (\let\@fnsymbol\@arabic has none). a unit is one macro node plus any string
			// node(s) glued onto it: \@fnsymbol tokenizes as the control symbol \@ plus a separate
			// "fnsymbol" string, so a fresh unit starts at every 'macro' node; a naive two-token
			// count would leave the second csname dangling unconsumed.
			let j = i + 1;
			let lastEnd = node.position.end?.offset ?? start;
			let units = 0;
			while (j < nodes.length && units < 2) {
				const nx = nodes[j] as LooseNode;
				if (nx.type === 'string' && /^=+$/.test(String(nx.content ?? ''))) {
					if (nx.position?.end) lastEnd = nx.position.end.offset;
					j++;
					continue; // the optional `=` doesn't start or count as a unit
				}
				if (nx.type !== 'macro') break; // whitespace, group, parbreak: not a unit start
				if (nx.position?.end) lastEnd = nx.position.end.offset;
				j++;
				units++;
				while (j < nodes.length && (nodes[j] as LooseNode).type === 'string') {
					const strNode = nodes[j] as LooseNode;
					if (strNode.position?.end) lastEnd = strNode.position.end.offset;
					j++;
				}
			}
			if (units >= 1) {
				node._raw = source.slice(start, lastEnd);
				nodes.splice(i + 1, j - (i + 1));
			}
		}
	}
}

/**
 * Preserve a whole `\NAME ... \DELIM` call verbatim when \NAME was \def-ined with a delimited
 * parameter. the span is the macro's ARGUMENT, very often math, but the parser sees \NAME as an
 * unknown zero-arg macro and text-escapes the span as prose (& to \&, _ to \_), destroying it.
 * must run AFTER heuristicMarkTeXPrimitiveDefs (which consumes the definitions' own tokens, so
 * only real call sites remain visible). the scan stops at a parbreak: a delimited macro's
 * argument can't contain a blank line, so an unmatched \NAME can never swallow unrelated content.
 */
export function heuristicMarkDelimitedMacroSpans(nodes: Node[] | undefined, source: string, pairs: Map<string, string>): void {
	if (!Array.isArray(nodes) || !source || pairs.size === 0) return;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i] as LooseNode;
		// content only, not args: same reasoning as heuristicMarkTeXPrimitiveDefs above.
		if (Array.isArray(node.content)) heuristicMarkDelimitedMacroSpans(node.content as Node[], source, pairs);

		if (node.type !== 'macro' || (node.args && node.args.length) || node._raw != null || !node.position) continue;
		const delim = pairs.get(node.content as string);
		if (!delim) continue;
		const start: number | undefined = node.position.start?.offset;
		if (typeof start !== 'number') continue;

		let j = i + 1;
		let end = -1;
		for (; j < nodes.length; j++) {
			const nx = nodes[j] as LooseNode;
			if (nx.type === 'parbreak') break;
			if (nx.type === 'macro' && nx.content === delim && !(nx.args && nx.args.length)) {
				end = nx.position?.end?.offset ?? -1;
				j++;
				break;
			}
		}
		if (end > start) {
			node._raw = source.slice(start, end);
			nodes.splice(i + 1, j - (i + 1));
		}
	}
}

/**
 * Infer an unknown command's arity from usage: a no-arg macro immediately followed by {...}
 * groups almost certainly takes them as arguments; recording `m` x count lets attachMacroArgs
 * re-attach them so they keep their braces. stops at a blank line so an unrelated group isn't
 * swallowed; ignores commands we already understand.
 */
export function heuristicInferUnknownMacroSignatures(
	ast: Root,
	isKnown: (name: string) => boolean,
	macroInfo: Record<string, { signature: string }>
): void {
	const MAX_ARGS = 9;
	const counts: Record<string, number> = {};

	// never infer inside math: math serializes verbatim, and many math macros (\over, \hat) are
	// followed by a {...} that is NOT their argument; attaching it restructures math and compounds.
	const isMath = (node: LooseNode): boolean =>
		node.type === 'mathenv' ||
		node.type === 'displaymath' ||
		node.type === 'inlinemath' ||
		(node.type === 'environment' && isMathEnvironment(node.env ?? ''));

	const walk = (nodes: Node[] | undefined): void => {
		if (!Array.isArray(nodes)) return;
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i] as LooseNode;
			if (isMath(node)) continue;
			if (node.type === 'macro') {
				const name = node.content as string;
				const hasArgs = node.args && node.args.length > 0;
				const known = isKnown(name) || ignoredMacros.has(name) || SCOPED_SWITCHES.has(name) || !!macroInfo[name];
				// letter/@ names only; skip control symbols like \\ and \,
				if (!hasArgs && !known && /^[a-zA-Z@]+$/.test(name)) {
					let n = 0;
					for (let j = i + 1; j < nodes.length && n < MAX_ARGS; j++) {
						const nx = nodes[j] as LooseNode;
						if (nx.type === 'whitespace' || nx.type === 'comment') continue;
						if (nx.type === 'group') {
							n++;
							continue;
						}
						break; // text / parbreak / macro / environment ends the argument run
					}
					if (n > 0) counts[name] = Math.max(counts[name] ?? 0, n);
				}
			}
			if (Array.isArray(node.content)) walk(node.content as Node[]);
			// recursing into args is load-bearing for most macros (table cell content IS re-walked
			// downstream, so an inferred \makecell signature is honoured), but NOT for a
			// RAW_WHOLESALE_ARG_MACROS macro: its one-shot printRaw rebuild silently drops an
			// inferred+attached signature instead of reproducing it.
			const skipArgs = node.type === 'macro' && RAW_WHOLESALE_ARG_MACROS.has(node.content as string);
			if (!skipArgs && node.args) for (const a of node.args) walk(a.content);
		}
	};
	walk(ast.content as Node[]);

	for (const [name, n] of Object.entries(counts)) {
		if (!macroInfo[name]) macroInfo[name] = { signature: Array(n).fill('m').join(' ') };
	}
}
