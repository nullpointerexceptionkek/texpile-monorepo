export type DocumentLanguage = 'en' | 'zh-hans' | 'zh-hant';

export interface EditorConfiguration {
	/** custom words to ignore in spell check. */
	dictionary: string[];
	spellcheck: boolean;
	/** show section numbers before headings (1, 1.1, ...). */
	showSectionNumbers?: boolean;
	/** document language for i18n and CJK font support. */
	language?: DocumentLanguage;
	transpileTemplate: string;
	transpileTemplateId?: string;
	transpileTemplateVersion?: string;
	collaboration: {
		anyone: 'read' | 'edit' | 'none';
		editors: string[];
	};
	exports?: Record<string, unknown>;
}
