// curated UI field lists per entry type; full BibLaTeX would mean ~41 optional fields for article
import { m } from '$lib/paraglide/messages';

export interface FieldConfig {
	name: string;
	label: string;
	type: 'text' | 'number' | 'textarea' | 'select';
	required: boolean;
	placeholder?: string;
	helpText?: string;
}

export interface EntryTypeConfig {
	name: string;
	label: string;
	fields: FieldConfig[];
}

// built per call, never cached in a module-level const: this module is imported before
// settings.ts applies the saved uiLocale, so a cached config would freeze on the base locale
function commonFields(): FieldConfig[] {
	return [
		{
			name: 'key',
			label: m.bibfield_label_citation_key(),
			type: 'text',
			required: true,
			helpText: m.bibfield_help_citation_key()
		},
		{
			name: 'author',
			label: m.bibfield_label_author(),
			type: 'text',
			required: true,
			helpText: m.bibfield_help_author()
		},
		{
			name: 'title',
			label: m.bibfield_label_title(),
			type: 'text',
			required: true
		},
		{
			name: 'year',
			label: m.bibfield_label_year(),
			type: 'text',
			required: true,
			helpText: m.bibfield_help_year()
		}
	];
}

export function getEntryTypeConfigs(): Record<string, EntryTypeConfig> {
	return {
		article: {
			name: 'article',
			label: m.bibfield_type_journal_article(),
			fields: [
				...commonFields(),
				{
					name: 'journaltitle',
					label: m.bibfield_label_journal_title(),
					type: 'text',
					required: true
				},
				{
					name: 'volume',
					label: m.bibfield_label_volume(),
					type: 'text',
					required: false
				},
				{
					name: 'number',
					label: m.bibfield_label_issue_number(),
					type: 'text',
					required: false
				},
				{
					name: 'pages',
					label: m.bibfield_label_pages(),
					type: 'text',
					required: false,
					placeholder: '1-10'
				},
				{
					name: 'doi',
					label: m.bibfield_label_doi(),
					type: 'text',
					required: false,
					placeholder: '10.1000/xyz123'
				}
			]
		},

		book: {
			name: 'book',
			label: m.bibfield_type_book(),
			fields: [
				...commonFields(),
				{
					name: 'publisher',
					label: m.bibfield_label_publisher(),
					type: 'text',
					required: false
				},
				{
					name: 'location',
					label: m.bibfield_label_location(),
					type: 'text',
					required: false,
					placeholder: 'City, Country'
				},
				{
					name: 'edition',
					label: m.bibfield_label_edition(),
					type: 'text',
					required: false,
					placeholder: '2nd'
				},
				{
					name: 'isbn',
					label: m.bibfield_label_isbn(),
					type: 'text',
					required: false
				}
			]
		},

		inbook: {
			name: 'inbook',
			label: m.bibfield_type_book_chapter(),
			fields: [
				...commonFields(),
				{
					name: 'booktitle',
					label: m.bibfield_label_book_title(),
					type: 'text',
					required: true
				},
				{
					name: 'chapter',
					label: m.bibfield_label_chapter(),
					type: 'text',
					required: false
				},
				{
					name: 'pages',
					label: m.bibfield_label_pages(),
					type: 'text',
					required: false
				},
				{
					name: 'publisher',
					label: m.bibfield_label_publisher(),
					type: 'text',
					required: false
				}
			]
		},

		incollection: {
			name: 'incollection',
			label: m.bibfield_type_collection_chapter(),
			fields: [
				...commonFields(),
				{
					name: 'editor',
					label: m.bibfield_label_editor(),
					type: 'text',
					required: true,
					helpText: m.bibfield_help_editor_of_collection()
				},
				{
					name: 'booktitle',
					label: m.bibfield_label_book_title(),
					type: 'text',
					required: true
				},
				{
					name: 'publisher',
					label: m.bibfield_label_publisher(),
					type: 'text',
					required: false
				},
				{
					name: 'pages',
					label: m.bibfield_label_pages(),
					type: 'text',
					required: false
				}
			]
		},

		inproceedings: {
			name: 'inproceedings',
			label: m.bibfield_type_conference_paper(),
			fields: [
				...commonFields(),
				{
					name: 'booktitle',
					label: m.bibfield_label_conference_name(),
					type: 'text',
					required: true
				},
				{
					name: 'pages',
					label: m.bibfield_label_pages(),
					type: 'text',
					required: false
				},
				{
					name: 'organization',
					label: m.bibfield_label_organization(),
					type: 'text',
					required: false
				},
				{
					name: 'location',
					label: m.bibfield_label_location(),
					type: 'text',
					required: false
				}
			]
		},

		thesis: {
			name: 'thesis',
			label: m.bibfield_type_thesis(),
			fields: [
				...commonFields(),
				{
					name: 'type',
					label: m.bibfield_label_thesis_type(),
					type: 'text',
					required: true,
					placeholder: "PhD thesis, Master's thesis, etc."
				},
				{
					name: 'institution',
					label: m.bibfield_label_institution(),
					type: 'text',
					required: true
				},
				{
					name: 'location',
					label: m.bibfield_label_location(),
					type: 'text',
					required: false
				}
			]
		},

		report: {
			name: 'report',
			label: m.bibfield_type_technical_report(),
			fields: [
				...commonFields(),
				{
					name: 'type',
					label: m.bibfield_label_report_type(),
					type: 'text',
					required: true,
					placeholder: 'Technical Report, Research Report, etc.'
				},
				{
					name: 'institution',
					label: m.bibfield_label_institution(),
					type: 'text',
					required: true
				},
				{
					name: 'number',
					label: m.bibfield_label_report_number(),
					type: 'text',
					required: false
				}
			]
		},

		online: {
			name: 'online',
			label: m.bibfield_type_online_resource(),
			fields: [
				{
					name: 'key',
					label: m.bibfield_label_citation_key(),
					type: 'text',
					required: true,
					helpText: m.bibfield_help_citation_key()
				},
				{
					name: 'author',
					label: m.bibfield_label_author(),
					type: 'text',
					required: false,
					helpText: m.bibfield_help_author_or_editor_required()
				},
				{
					name: 'editor',
					label: m.bibfield_label_editor(),
					type: 'text',
					required: false,
					helpText: m.bibfield_help_required_if_no_author()
				},
				{
					name: 'title',
					label: m.bibfield_label_title(),
					type: 'text',
					required: true
				},
				{
					name: 'year',
					label: m.bibfield_label_year(),
					type: 'text',
					required: true
				},
				{
					name: 'url',
					label: m.bibfield_label_url(),
					type: 'text',
					required: false,
					helpText: m.bibfield_help_url_doi_or_eprint()
				},
				{
					name: 'doi',
					label: m.bibfield_label_doi(),
					type: 'text',
					required: false
				},
				{
					name: 'urldate',
					label: m.bibfield_label_access_date(),
					type: 'text',
					required: false,
					placeholder: 'YYYY-MM-DD'
				}
			]
		},

		misc: {
			name: 'misc',
			label: m.bibfield_type_miscellaneous(),
			fields: [
				{
					name: 'key',
					label: m.bibfield_label_citation_key(),
					type: 'text',
					required: true,
					helpText: m.bibfield_help_citation_key()
				},
				{
					name: 'author',
					label: m.bibfield_label_author(),
					type: 'text',
					required: false
				},
				{
					name: 'title',
					label: m.bibfield_label_title(),
					type: 'text',
					required: true
				},
				{
					name: 'year',
					label: m.bibfield_label_year(),
					type: 'text',
					required: true
				},
				{
					name: 'howpublished',
					label: m.bibfield_label_how_published(),
					type: 'text',
					required: false
				},
				{
					name: 'note',
					label: m.bibfield_label_note(),
					type: 'textarea',
					required: false
				}
			]
		},

		dataset: {
			name: 'dataset',
			label: m.bibfield_type_dataset(),
			fields: [
				{
					name: 'key',
					label: m.bibfield_label_citation_key(),
					type: 'text',
					required: true
				},
				{
					name: 'author',
					label: m.bibfield_label_author(),
					type: 'text',
					required: false
				},
				{
					name: 'title',
					label: m.bibfield_label_title(),
					type: 'text',
					required: true
				},
				{
					name: 'year',
					label: m.bibfield_label_year(),
					type: 'text',
					required: true
				},
				{
					name: 'version',
					label: m.bibfield_label_version(),
					type: 'text',
					required: false
				},
				{
					name: 'publisher',
					label: m.bibfield_label_publisher(),
					type: 'text',
					required: false
				},
				{
					name: 'doi',
					label: m.bibfield_label_doi(),
					type: 'text',
					required: false
				}
			]
		}
	};
}

export function getFieldsForType(entrytype: string): FieldConfig[] {
	const config = getEntryTypeConfigs()[entrytype];
	return config ? config.fields : commonFields();
}

export function getEntryTypeOptions(): Array<{ value: string; label: string }> {
	return Object.values(getEntryTypeConfigs()).map((config) => ({
		value: config.name,
		label: config.label
	}));
}

export function getRequiredFields(entrytype: string): string[] {
	const fields = getFieldsForType(entrytype);
	return fields.filter((f) => f.required).map((f) => f.name);
}
