import type { Locale } from './paraglide/runtime';

export interface LocaleMeta {
	short: string;
	label: string;
	/** true until a native/fluent speaker has reviewed this locale's translations. */
	machineTranslated?: boolean;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
	en: { short: 'EN', label: 'English' },
	'zh-Hans': { short: '简', label: '简体中文' },
	'zh-Hant': { short: '繁', label: '繁體中文' },
	de: { short: 'DE', label: 'Deutsch', machineTranslated: true }
};
