// curated UI field lists per entry type; full BibLaTeX would mean ~41 optional fields for article
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

const commonFields: FieldConfig[] = [
	{
		name: 'key',
		label: 'Citation Key',
		type: 'text',
		required: true,
		helpText: 'Unique identifier (e.g., smith2020)'
	},
	{
		name: 'author',
		label: 'Author',
		type: 'text',
		required: true,
		helpText: 'Last, First or multiple authors separated by "and"'
	},
	{
		name: 'title',
		label: 'Title',
		type: 'text',
		required: true
	},
	{
		name: 'year',
		label: 'Year',
		type: 'text',
		required: true,
		helpText: 'Publication year (YYYY)'
	}
];

export const entryTypeConfigs: Record<string, EntryTypeConfig> = {
	article: {
		name: 'article',
		label: 'Journal Article',
		fields: [
			...commonFields,
			{
				name: 'journaltitle',
				label: 'Journal Title',
				type: 'text',
				required: true
			},
			{
				name: 'volume',
				label: 'Volume',
				type: 'text',
				required: false
			},
			{
				name: 'number',
				label: 'Issue Number',
				type: 'text',
				required: false
			},
			{
				name: 'pages',
				label: 'Pages',
				type: 'text',
				required: false,
				placeholder: '1-10'
			},
			{
				name: 'doi',
				label: 'DOI',
				type: 'text',
				required: false,
				placeholder: '10.1000/xyz123'
			}
		]
	},

	book: {
		name: 'book',
		label: 'Book',
		fields: [
			...commonFields,
			{
				name: 'publisher',
				label: 'Publisher',
				type: 'text',
				required: false
			},
			{
				name: 'location',
				label: 'Location',
				type: 'text',
				required: false,
				placeholder: 'City, Country'
			},
			{
				name: 'edition',
				label: 'Edition',
				type: 'text',
				required: false,
				placeholder: '2nd'
			},
			{
				name: 'isbn',
				label: 'ISBN',
				type: 'text',
				required: false
			}
		]
	},

	inbook: {
		name: 'inbook',
		label: 'Book Chapter',
		fields: [
			...commonFields,
			{
				name: 'booktitle',
				label: 'Book Title',
				type: 'text',
				required: true
			},
			{
				name: 'chapter',
				label: 'Chapter',
				type: 'text',
				required: false
			},
			{
				name: 'pages',
				label: 'Pages',
				type: 'text',
				required: false
			},
			{
				name: 'publisher',
				label: 'Publisher',
				type: 'text',
				required: false
			}
		]
	},

	incollection: {
		name: 'incollection',
		label: 'Collection Chapter',
		fields: [
			...commonFields,
			{
				name: 'editor',
				label: 'Editor',
				type: 'text',
				required: true,
				helpText: 'Editor(s) of the collection'
			},
			{
				name: 'booktitle',
				label: 'Book Title',
				type: 'text',
				required: true
			},
			{
				name: 'publisher',
				label: 'Publisher',
				type: 'text',
				required: false
			},
			{
				name: 'pages',
				label: 'Pages',
				type: 'text',
				required: false
			}
		]
	},

	inproceedings: {
		name: 'inproceedings',
		label: 'Conference Paper',
		fields: [
			...commonFields,
			{
				name: 'booktitle',
				label: 'Conference Name',
				type: 'text',
				required: true
			},
			{
				name: 'pages',
				label: 'Pages',
				type: 'text',
				required: false
			},
			{
				name: 'organization',
				label: 'Organization',
				type: 'text',
				required: false
			},
			{
				name: 'location',
				label: 'Location',
				type: 'text',
				required: false
			}
		]
	},

	thesis: {
		name: 'thesis',
		label: 'Thesis',
		fields: [
			...commonFields,
			{
				name: 'type',
				label: 'Thesis Type',
				type: 'text',
				required: true,
				placeholder: "PhD thesis, Master's thesis, etc."
			},
			{
				name: 'institution',
				label: 'Institution',
				type: 'text',
				required: true
			},
			{
				name: 'location',
				label: 'Location',
				type: 'text',
				required: false
			}
		]
	},

	report: {
		name: 'report',
		label: 'Technical Report',
		fields: [
			...commonFields,
			{
				name: 'type',
				label: 'Report Type',
				type: 'text',
				required: true,
				placeholder: 'Technical Report, Research Report, etc.'
			},
			{
				name: 'institution',
				label: 'Institution',
				type: 'text',
				required: true
			},
			{
				name: 'number',
				label: 'Report Number',
				type: 'text',
				required: false
			}
		]
	},

	online: {
		name: 'online',
		label: 'Online Resource',
		fields: [
			{
				name: 'key',
				label: 'Citation Key',
				type: 'text',
				required: true,
				helpText: 'Unique identifier (e.g., smith2020)'
			},
			{
				name: 'author',
				label: 'Author',
				type: 'text',
				required: false,
				helpText: 'Author or editor is required'
			},
			{
				name: 'editor',
				label: 'Editor',
				type: 'text',
				required: false,
				helpText: 'Required if no author provided'
			},
			{
				name: 'title',
				label: 'Title',
				type: 'text',
				required: true
			},
			{
				name: 'year',
				label: 'Year',
				type: 'text',
				required: true
			},
			{
				name: 'url',
				label: 'URL',
				type: 'text',
				required: false,
				helpText: 'URL, DOI, or eprint required'
			},
			{
				name: 'doi',
				label: 'DOI',
				type: 'text',
				required: false
			},
			{
				name: 'urldate',
				label: 'Access Date',
				type: 'text',
				required: false,
				placeholder: 'YYYY-MM-DD'
			}
		]
	},

	misc: {
		name: 'misc',
		label: 'Miscellaneous',
		fields: [
			{
				name: 'key',
				label: 'Citation Key',
				type: 'text',
				required: true,
				helpText: 'Unique identifier (e.g., smith2020)'
			},
			{
				name: 'author',
				label: 'Author',
				type: 'text',
				required: false
			},
			{
				name: 'title',
				label: 'Title',
				type: 'text',
				required: true
			},
			{
				name: 'year',
				label: 'Year',
				type: 'text',
				required: true
			},
			{
				name: 'howpublished',
				label: 'How Published',
				type: 'text',
				required: false
			},
			{
				name: 'note',
				label: 'Note',
				type: 'textarea',
				required: false
			}
		]
	},

	dataset: {
		name: 'dataset',
		label: 'Dataset',
		fields: [
			{
				name: 'key',
				label: 'Citation Key',
				type: 'text',
				required: true
			},
			{
				name: 'author',
				label: 'Author',
				type: 'text',
				required: false
			},
			{
				name: 'title',
				label: 'Title',
				type: 'text',
				required: true
			},
			{
				name: 'year',
				label: 'Year',
				type: 'text',
				required: true
			},
			{
				name: 'version',
				label: 'Version',
				type: 'text',
				required: false
			},
			{
				name: 'publisher',
				label: 'Publisher',
				type: 'text',
				required: false
			},
			{
				name: 'doi',
				label: 'DOI',
				type: 'text',
				required: false
			}
		]
	}
};

export function getFieldsForType(entrytype: string): FieldConfig[] {
	const config = entryTypeConfigs[entrytype];
	return config ? config.fields : commonFields;
}

export function getEntryTypeOptions(): Array<{ value: string; label: string }> {
	return Object.values(entryTypeConfigs).map((config) => ({
		value: config.name,
		label: config.label
	}));
}

export function getRequiredFields(entrytype: string): string[] {
	const fields = getFieldsForType(entrytype);
	return fields.filter((f) => f.required).map((f) => f.name);
}
