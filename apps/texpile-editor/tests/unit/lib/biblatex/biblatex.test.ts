import { describe, it, expect } from 'vitest';
import {
	parseBibTeXWithWarnings,
	parseSingleEntry,
	serializeBibTeX,
	fitsVisualEditor,
	type BibToken,
	type BibLaTeXReference
} from '../../../../src/lib/biblatex/index';

describe('parseBibTeXWithWarnings — read path', () => {
	it('emits every syntactically-valid entry regardless of schema fit', () => {
		// legacy `journal` (not biblatex `journaltitle`) is the deliberate schema misfit
		const bib = `
@Article{legacy1, author = {A}, title = {T1}, journal = {J}, year = {2001}}
@Article{legacy2, author = {B}, title = {T2}, journal = {J}, year = {2002}}
		`.trim();
		const result = parseBibTeXWithWarnings(bib);
		expect(result.parseError).toBeUndefined();
		expect(result.entries.map((e) => e.key)).toEqual(['legacy1', 'legacy2']);
		// no alias rename
		expect(result.entries[0].journal).toBe('J');
	});

	it('captures between-entry `%` line comments as comment tokens in file order', () => {
		const bib = `
% top-of-file note
@Article{a, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}
% between comment
@Article{b, author = {B}, title = {T2}, journaltitle = {J}, year = {2002}}
		`.trim();
		const result = parseBibTeXWithWarnings(bib);
		const kinds = result.tokens.map((t) => t.kind);
		expect(kinds).toEqual(['comment', 'entry', 'comment', 'entry']);
		const commentTokens = result.tokens.filter((t): t is Extract<BibToken, { kind: 'comment' }> => t.kind === 'comment');
		expect(commentTokens[0].text).toContain('top-of-file note');
		expect(commentTokens[1].text).toContain('between comment');
	});

	it('captures @Comment{} / @Preamble{} / @String{} blocks as tokens (not entries)', () => {
		const bib = `
@Preamble{"\\newcommand{\\foo}{bar}"}
@String{acmcs = "ACM Computing Surveys"}
@Comment{This is a comment block}
@Article{x, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}
		`.trim();
		const result = parseBibTeXWithWarnings(bib);
		const kinds = result.tokens.map((t) => t.kind);
		expect(kinds).toEqual(['preamble', 'string', 'comment', 'entry']);
		expect(result.entries.map((e) => e.key)).toEqual(['x']);
	});

	it('sets hasInlineComment when a `%` line lives INSIDE an entry body', () => {
		const bib = `
@Article{dirty,
  author = {A},
  % inside comment
  title = {T},
  journaltitle = {J},
  year = {2001}
}
@Article{clean, author = {B}, title = {T2}, journaltitle = {J}, year = {2002}}
		`.trim();
		const result = parseBibTeXWithWarnings(bib);
		const [dirty, clean] = result.entries;
		expect(dirty.hasInlineComment).toBe(true);
		expect(clean.hasInlineComment).toBe(false);
	});

	it('preserves field insertion order (matches file order)', () => {
		const bib = `@Article{x, author = {A}, title = {T}, journaltitle = {J}, year = {2001}, volume = {1}}`;
		const result = parseBibTeXWithWarnings(bib);
		const ref = result.entries[0];
		// strip internal bookkeeping fields before comparing order
		const fieldKeys = Object.keys(ref).filter((k) => !['key', 'entrytype', 'raw', 'displayLabel', 'hasInlineComment'].includes(k));
		expect(fieldKeys).toEqual(['author', 'title', 'journaltitle', 'year', 'volume']);
	});

	it('returns parseError (and no entries/tokens) when the whole file is unparseable', () => {
		const bib = `@Article{broken, author = {A`; // unclosed brace
		const result = parseBibTeXWithWarnings(bib);
		expect(result.parseError).toBeTruthy();
		expect(result.entries).toEqual([]);
	});

	it('computes a displayLabel from author + year + title', () => {
		const bib = `@Article{k, author = {Smith, John and Doe, Jane}, title = {A Very Long Title Goes Here}, journaltitle = {J}, year = {2001}}`;
		const [entry] = parseBibTeXWithWarnings(bib).entries;
		expect(entry.displayLabel).toContain('Smith');
		expect(entry.displayLabel).toContain('(2001)');
		expect(entry.displayLabel).toContain('A Very Long Title');
	});
});

describe('fitsVisualEditor — strict fit rule', () => {
	const article = (extra: Record<string, unknown> = {}, key = 'k'): BibLaTeXReference => ({
		key,
		entrytype: 'article',
		author: 'Smith',
		title: 'T',
		journaltitle: 'J',
		year: '2001',
		...extra
	});

	it('accepts a well-formed @Article using BibLaTeX field names', () => {
		expect(fitsVisualEditor(article())).toBe(true);
	});

	it('rejects an @Article that uses legacy `journal` instead of `journaltitle`', () => {
		const ref: BibLaTeXReference = { key: 'k', entrytype: 'article', author: 'A', title: 'T', journal: 'J', year: '2001' };
		expect(fitsVisualEditor(ref)).toBe(false);
	});

	it('rejects an @Book with `address` instead of `location`', () => {
		const ref: BibLaTeXReference = { key: 'k', entrytype: 'book', author: 'A', title: 'T', address: 'NY', year: '2001' };
		expect(fitsVisualEditor(ref)).toBe(false);
	});

	it('accepts an @Book with BibLaTeX `location`', () => {
		const ref: BibLaTeXReference = { key: 'k', entrytype: 'book', author: 'A', title: 'T', location: 'NY', year: '2001' };
		expect(fitsVisualEditor(ref)).toBe(true);
	});

	it('rejects when a required field is missing', () => {
		// article requires journaltitle
		const ref: BibLaTeXReference = { key: 'k', entrytype: 'article', author: 'A', title: 'T', year: '2001' };
		expect(fitsVisualEditor(ref)).toBe(false);
	});

	it('rejects an unknown entrytype', () => {
		const ref: BibLaTeXReference = { key: 'k', entrytype: 'gizmo', title: 'T' };
		expect(fitsVisualEditor(ref)).toBe(false);
	});

	it('rejects an entry with hasInlineComment (would lose the comment on regenerate)', () => {
		expect(fitsVisualEditor(article({ hasInlineComment: true }))).toBe(false);
	});

	it('ignores internal bookkeeping fields (raw, displayLabel, hasInlineComment=false)', () => {
		expect(fitsVisualEditor(article({ raw: '@Article{…}', displayLabel: 'Smith (2001)', hasInlineComment: false }))).toBe(true);
	});
});

describe('parseSingleEntry — raw-CM save', () => {
	it('accepts exactly one entry', () => {
		const result = parseSingleEntry(`@Article{k, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}`);
		expect('entry' in result).toBe(true);
		if ('entry' in result) expect(result.entry.key).toBe('k');
	});

	it('errors when no entry is present', () => {
		const result = parseSingleEntry(`% just a comment\n`);
		expect('error' in result).toBe(true);
	});

	it('errors when the input contains more than one entry', () => {
		const result = parseSingleEntry(
			`
@Article{a, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}
@Article{b, author = {B}, title = {U}, journaltitle = {J}, year = {2002}}
		`.trim()
		);
		expect('error' in result).toBe(true);
	});

	it('errors when the entry has no citation key', () => {
		const result = parseSingleEntry(`@Article{, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}`);
		expect('error' in result).toBe(true);
	});
});

describe('serializeBibTeX — round-trip', () => {
	it('preserves between-entry `%` comments and their file position', () => {
		const src = `
% top note
@Article{a, author = {A}, title = {T1}, journaltitle = {J}, year = {2001}}
% mid note
@Article{b, author = {B}, title = {T2}, journaltitle = {J}, year = {2002}}
		`.trim();
		const { tokens, entries } = parseBibTeXWithWarnings(src);
		const out = serializeBibTeX(tokens, new Map(entries.map((e) => [e.key, e])));
		expect(out.indexOf('% top note')).toBeLessThan(out.indexOf('@Article{a'));
		expect(out.indexOf('@Article{a')).toBeLessThan(out.indexOf('% mid note'));
		expect(out.indexOf('% mid note')).toBeLessThan(out.indexOf('@Article{b'));
	});

	it('preserves @Preamble / @String / @Comment blocks verbatim in place', () => {
		const src = `
@Preamble{"\\foo"}
@String{acmcs = "ACM Computing Surveys"}
@Article{a, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}
@Comment{trailing note}
		`.trim();
		const { tokens, entries } = parseBibTeXWithWarnings(src);
		const out = serializeBibTeX(tokens, new Map(entries.map((e) => [e.key, e])));
		expect(out).toContain('@Preamble');
		expect(out).toContain('@String');
		expect(out).toContain('@Comment{trailing note}');
	});

	it('skips entries whose keys were removed from refsByKey (delete path)', () => {
		const src = `
@Article{keep, author = {A}, title = {T1}, journaltitle = {J}, year = {2001}}
@Article{drop, author = {B}, title = {T2}, journaltitle = {J}, year = {2002}}
		`.trim();
		const { tokens, entries } = parseBibTeXWithWarnings(src);
		const kept = new Map(entries.filter((e) => e.key === 'keep').map((e) => [e.key, e]));
		const out = serializeBibTeX(tokens, kept);
		expect(out).toContain('@Article{keep');
		expect(out).not.toContain('@Article{drop');
	});

	it('uses ref.raw when present (round-trip untouched by the visual form)', () => {
		const src = `@Article{a, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}`;
		const { tokens, entries } = parseBibTeXWithWarnings(src);
		const out = serializeBibTeX(tokens, new Map(entries.map((e) => [e.key, e])));
		// raw is populated from the source range; the serializer prefers it
		expect(out).toContain(entries[0].raw!.trim());
	});

	it('regenerates from fields when ref.raw is cleared (visual-form edit path)', () => {
		const src = `@Article{a, author = {A}, title = {T}, journaltitle = {J}, year = {2001}}`;
		const { tokens, entries } = parseBibTeXWithWarnings(src);
		const edited: BibLaTeXReference = { ...entries[0], title: 'New Title', raw: undefined };
		const out = serializeBibTeX(tokens, new Map([[edited.key, edited]]));
		expect(out).toContain('New Title');
		expect(out).not.toContain('title = {T}');
	});
});
