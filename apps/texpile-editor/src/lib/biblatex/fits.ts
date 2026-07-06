// decides whether an entry can render and round-trip in BibManager's visual form;
// anything that can't gets demoted to a raw CodeMirror row so no data is silently lost
import type { BibLaTeXReference } from './types';
import { biblatexReferenceSchema, perTypeSchemas } from './schema';

const INTERNAL_FIELDS = new Set(['key', 'entrytype', 'raw', 'displayLabel', 'hasInlineComment']);

// precomputed once so fitsVisualEditor is a cheap set lookup
const KNOWN_FIELDS_BY_TYPE: Record<string, Set<string>> = Object.fromEntries(
	Object.entries(perTypeSchemas).map(([type, schema]) => [type, new Set(Object.keys(schema.shape))])
);

export function fitsVisualEditor(ref: BibLaTeXReference): boolean {
	// a % comment inside the entry body: regenerating from fields would lose it
	if (ref.hasInlineComment) return false;

	// unknown entrytype has no visual form
	const knownFields = KNOWN_FIELDS_BY_TYPE[ref.entrytype];
	if (!knownFields) return false;

	// a field the form can't render would be silently dropped on save
	for (const key of Object.keys(ref)) {
		if (INTERNAL_FIELDS.has(key)) continue;
		if (ref[key] === undefined) continue;
		if (!knownFields.has(key)) return false;
	}

	return biblatexReferenceSchema.safeParse(ref).success;
}
