import type { MarkSpec, Schema } from 'prosemirror-model';

export const suggestionMarks: Record<string, MarkSpec> = {
	suggestion_insert: {
		attrs: { username: { default: null } },
		inclusive: false,
		excludes: 'suggestion_delete',
		spanning: true,
		parseDOM: [
			{
				tag: 'span[data-suggestion-add]',
				getAttrs(dom: HTMLElement) {
					return { username: dom.getAttribute('data-username') || null };
				}
			}
		],
		toDOM(node) {
			return [
				'span',
				{
					'data-suggestion-add': 'true',
					'data-username': node.attrs.username || '',
					class: 'suggestion-add'
				},
				0
			];
		}
	},
	suggestion_delete: {
		attrs: { username: { default: null } },
		inclusive: false,
		excludes: 'suggestion_insert',
		spanning: true,
		parseDOM: [
			{
				tag: 'span[data-suggestion-delete]',
				getAttrs(dom: HTMLElement) {
					return { username: dom.getAttribute('data-username') || null };
				}
			}
		],
		toDOM(node) {
			return [
				'span',
				{
					'data-suggestion-delete': 'true',
					'data-username': node.attrs.username || '',
					class: 'suggestion-delete'
				},
				0
			];
		}
	}
};

export const addSuggestionMarks = (marks: Schema['spec']['marks'] | Record<string, MarkSpec>): Record<string, MarkSpec> => {
	const result: Record<string, MarkSpec> = {};

	// schema marks are an OrderedMap, which isn't a direct dependency here; check structurally
	// by its one distinguishing method instead of importing the class or widening to any
	const isOrderedMap = (m: typeof marks): m is { forEach: (fn: (key: string, value: MarkSpec) => void) => void } =>
		typeof (m as { forEach?: unknown }).forEach === 'function';

	if (isOrderedMap(marks)) {
		marks.forEach((key, value) => {
			result[key] = value;
		});
	} else {
		Object.assign(result, marks);
	}

	result.suggestion_insert = suggestionMarks.suggestion_insert;
	result.suggestion_delete = suggestionMarks.suggestion_delete;

	return result;
};
