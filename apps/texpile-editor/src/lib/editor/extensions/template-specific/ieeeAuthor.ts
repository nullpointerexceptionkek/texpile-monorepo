// parses an IEEEtran \author block (\IEEEauthorblockN/\IEEEauthorblockA, \and separated) into
// structured data for a READ-ONLY preview. never regenerates latex: the raw block stays the
// source of truth, and anything off-shape returns null so the caller falls back to the raw editor.

export interface AffilLine {
	text: string;
	/** The line was wrapped in \textit{…} (IEEE italicises affiliation lines). */
	italic: boolean;
}

export interface IEEEAuthor {
	name: string;
	/** Name carried a leading "N\textsuperscript{st|nd|…}" ordinal (regenerated from card order). */
	ordinal: boolean;
	affil: AffilLine[];
}

/** A raw block that looks like an IEEE \author{…\IEEEauthorblockN…} block. */
export function isIEEEAuthorBlock(text: string): boolean {
	const t = text.trim();
	return /^\\author\s*\{/.test(t) && /\\IEEEauthorblockN/.test(t);
}

const ORDINAL_RE = /^\s*\d+\s*\\textsuperscript\s*\{(?:st|nd|rd|th)\}\s*/;

/** The balanced `{…}` immediately following `\macro` in `text`, or null if absent/unbalanced. */
function braced(text: string, macro: string): string | null {
	const at = text.indexOf(macro);
	if (at < 0) return null;
	let i = at + macro.length;
	while (i < text.length && /\s/.test(text[i])) i++;
	if (text[i] !== '{') return null;
	const start = ++i;
	let depth = 1;
	for (; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return text.slice(start, i);
	}
	return null;
}

/** Split on top-level `\and` (control word, brace depth 0). */
function splitByAnd(inner: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let last = 0;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (c === '{') depth++;
		else if (c === '}') depth--;
		else if (depth === 0 && c === '\\' && inner.startsWith('\\and', i) && !/[a-zA-Z]/.test(inner[i + 4] ?? ' ')) {
			parts.push(inner.slice(last, i));
			i += 3;
			last = i + 1;
		}
	}
	parts.push(inner.slice(last));
	return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Parse an IEEE \author block into author cards, or null if it isn't the expected shape. */
export function parseIEEEAuthors(text: string): IEEEAuthor[] | null {
	const inner = braced(text.trim(), '\\author');
	if (inner == null) return null;
	const authors: IEEEAuthor[] = [];
	for (const chunk of splitByAnd(inner)) {
		const name = braced(chunk, '\\IEEEauthorblockN');
		if (name == null) return null; // not the shape we model, bail to raw
		const affilRaw = braced(chunk, '\\IEEEauthorblockA');
		const ordinal = ORDINAL_RE.test(name);
		const affil: AffilLine[] = (affilRaw ?? '')
			.split(/\\\\/)
			.map((l) => l.trim())
			.filter((l) => l.length > 0)
			.map((l) => {
				const m = l.match(/^\\textit\s*\{([\s\S]*)\}$/);
				return m ? { text: m[1].trim(), italic: true } : { text: l, italic: false };
			});
		authors.push({ name: name.replace(ORDINAL_RE, '').trim(), ordinal, affil });
	}
	return authors.length > 0 ? authors : null;
}

/** "1st", "2nd", "3rd", "4th", ... for displaying the author ordinal in the preview. */
export function ordinalLabel(n: number): string {
	const v = n % 100;
	const suffix = v >= 11 && v <= 13 ? 'th' : (['st', 'nd', 'rd'][(n % 10) - 1] ?? 'th');
	return `${n}${suffix}`;
}
