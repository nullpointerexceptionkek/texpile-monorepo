import type { AppSettings } from './settings';

export interface LocaleMeta {
	label: string;
	/** true until a native/fluent speaker has reviewed this locale's translations. */
	machineTranslated?: boolean;
}

export const LOCALE_META: Record<AppSettings['uiLocale'], LocaleMeta> = {
	en: { label: 'English' },
	'zh-Hans': { label: '简体中文' },
	'zh-Hant': { label: '繁體中文' },
	de: { label: 'Deutsch', machineTranslated: true }
};
