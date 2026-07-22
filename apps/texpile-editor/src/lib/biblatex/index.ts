export type { BibLaTeXReference } from './types';

export {
	parseBibTeX,
	parseBibTeXWithWarnings,
	parseSingleEntry,
	serializeBibTeX,
	referencesToBib,
	findDuplicateKeys,
	isKeyUnique
} from './parser.new';
export type { ParseBibTeXResult } from './parser.new';
export type { BibToken } from './bibtexParser';

// schema validation is opt-in, used only by the visual add/edit form on save
export { BibEntrySchema, biblatexReferenceSchema } from './schema';

export { fitsVisualEditor } from './fits';

export {
	getEntryTypeConfigs,
	getFieldsForType,
	getEntryTypeOptions,
	getRequiredFields,
	type FieldConfig,
	type EntryTypeConfig
} from './fieldConfig';
