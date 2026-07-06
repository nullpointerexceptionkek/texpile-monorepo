import type { BibLaTeXReference } from './types';
import { parseBibTeXTokens, toBibTeX, type BibToken } from './bibtexParser';

/** internal bookkeeping fields, must never leak into .bib output. */
const INTERNAL_FIELDS = new Set(['key', 'entrytype', 'raw', 'displayLabel', 'hasInlineComment']);

export function findDuplicateKeys(references: BibLaTeXReference[]): string[] {
	const keys = new Set<string>();
	const duplicates = new Set<string>();

	for (const ref of references) {
		if (keys.has(ref.key)) {
			duplicates.add(ref.key);
		} else {
			keys.add(ref.key);
		}
	}

	return Array.from(duplicates);
}

/** true when the key is unique; excludeKey ignores the ref being edited. */
export function isKeyUnique(key: string, existingReferences: BibLaTeXReference[], excludeKey?: string): boolean {
	return !existingReferences.some((r) => r.key === key && r.key !== excludeKey);
}

/** tokens is the full file-order stream so the serializer can round-trip everything; entries is the entry-only view. */
export interface ParseBibTeXResult {
	tokens: BibToken[];
	entries: BibLaTeXReference[];
	warnings: { key: string; issues: string[] }[];
	parseError?: string;
}

export function parseBibTeX(bibtexContent: string): BibLaTeXReference[] {
	return parseBibTeXWithWarnings(bibtexContent).entries;
}

/**
 * Read path: every syntactically valid entry survives, no schema enforcement or aliasing.
 * A whole-file parse failure returns parseError so the UI can fall back to raw CodeMirror.
 */
export function parseBibTeXWithWarnings(bibtexContent: string): ParseBibTeXResult {
	if (!bibtexContent || !bibtexContent.trim()) {
		return { tokens: [], entries: [], warnings: [] };
	}

	let tokens: BibToken[];
	try {
		tokens = parseBibTeXTokens(bibtexContent);
	} catch (error) {
		return { tokens: [], entries: [], warnings: [], parseError: String(error) };
	}

	const entries: BibLaTeXReference[] = [];
	for (const token of tokens) {
		if (token.kind !== 'entry') continue;
		const rawEntry = token.entry;
		if (!rawEntry.citationKey) continue; // an entry without a key can't be cited
		entries.push(entryFromToken(token));
	}

	return { tokens, entries, warnings: [] };
}

/** converts one entry token into the loose BibLaTeXReference consumers read. */
function entryFromToken(token: Extract<BibToken, { kind: 'entry' }>): BibLaTeXReference {
	const rawEntry = token.entry;
	const entry: BibLaTeXReference = {
		key: rawEntry.citationKey,
		entrytype: rawEntry.entryType.toLowerCase()
	};
	// fields land under their lowercased names, exactly as written: no journal/journaltitle
	// aliasing, the visual form's schema complains on save instead
	for (const [k, v] of Object.entries(rawEntry.entryTags)) {
		if (v !== undefined && v !== '') entry[k.toLowerCase()] = v;
	}
	entry.raw = token.raw;
	entry.hasInlineComment = token.hasInlineComment;
	entry.displayLabel = computeDisplayLabel(entry);
	return entry;
}

/** re-parses one entry edited in the raw pane; returns { error } unless exactly one keyed entry parses. */
export function parseSingleEntry(text: string): { entry: BibLaTeXReference } | { error: string } {
	let tokens: BibToken[];
	try {
		tokens = parseBibTeXTokens(text);
	} catch (e) {
		return { error: String(e) };
	}
	const entryTokens = tokens.filter((t): t is Extract<BibToken, { kind: 'entry' }> => t.kind === 'entry');
	if (entryTokens.length === 0) return { error: 'No entry found. The block must start with `@type{key, ...}`.' };
	if (entryTokens.length > 1) return { error: 'Expected exactly one entry, found ' + entryTokens.length + '.' };
	const token = entryTokens[0];
	if (!token.entry.citationKey) return { error: 'Entry is missing a citation key.' };
	return { entry: entryFromToken(token) };
}

/**
 * Emit a .bib from the token stream. Non-entry tokens re-emit verbatim (that's how comments,
 * @Preamble and @String round-trip); entry tokens look up refsByKey, missing means deleted.
 * Tokens are joined by one blank line; spacing between blocks isn't preserved beyond that.
 */
export function serializeBibTeX(tokens: BibToken[], refsByKey: Map<string, BibLaTeXReference>): string {
	const parts: string[] = [];
	for (const token of tokens) {
		if (token.kind === 'entry') {
			const ref = refsByKey.get(token.entry.citationKey);
			if (!ref) continue; // deleted
			// prefer untouched raw so inside-entry formatting round-trips; regenerate once the form edited it
			parts.push(ref.raw ?? renderReferenceAsBib(ref));
		} else {
			parts.push(token.text);
		}
	}
	return parts.join('\n\n') + '\n';
}

/** renders one loose reference as a pretty-printed @type{key, field = {value}, ...} block. */
function renderReferenceAsBib(ref: BibLaTeXReference): string {
	const entryTags: Record<string, string> = {};
	for (const [field, value] of Object.entries(ref)) {
		if (INTERNAL_FIELDS.has(field)) continue;
		if (value === undefined || value === '') continue;
		entryTags[field] = Array.isArray(value) ? value.join(' and ') : String(value);
	}
	return toBibTeX([{ citationKey: ref.key, entryType: ref.entrytype, entryTags }], false).trimEnd();
}

/** short label for \cite autocomplete, best effort. */
function computeDisplayLabel(entry: BibLaTeXReference): string {
	// first author's last name: split on " and ", take the part before the comma
	const firstAuthor = entry.author
		?.split(/\s+and\s+/i)[0]
		?.split(',')[0]
		?.trim();
	const year = entry.year || entry.date?.slice(0, 4);
	// strip braces, cap length so the dropdown row doesn't wrap
	const title = entry.title?.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
	const bits: string[] = [];
	if (firstAuthor) bits.push(firstAuthor);
	if (year) bits.push(`(${year})`);
	if (title) bits.push(`· ${title}`);
	return bits.length ? bits.join(' ') : entry.key;
}

export function referencesToBib(
	references: BibLaTeXReference[] | Record<string, BibLaTeXReference> | BibLaTeXReference | null | undefined
): string {
	const refsArray: BibLaTeXReference[] = Array.isArray(references)
		? references
		: references && typeof references === 'object'
			? 'entrytype' in references && 'key' in references
				? [references as BibLaTeXReference]
				: Object.values(references as Record<string, BibLaTeXReference>)
			: [];

	// skip internal fields so they don't leak into the emitted .bib
	const rawEntries = refsArray.map((ref) => {
		const entryTags: Record<string, string> = {};
		for (const [field, value] of Object.entries(ref)) {
			if (INTERNAL_FIELDS.has(field)) continue;
			if (value === undefined || value === '') continue;
			entryTags[field] = Array.isArray(value) ? value.join(' and ') : String(value);
		}
		return { citationKey: ref.key, entryType: ref.entrytype, entryTags };
	});

	return toBibTeX(rawEntries, false); // false = pretty-printed
}
