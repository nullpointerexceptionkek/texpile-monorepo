import { writable } from 'svelte/store';

export interface TocItem {
	level: number;
	text: string;
	pos: number;
}

/** Headings of the current document, kept in sync by the TOC plugin (createTocPlugin). */
export const tocStore = writable<TocItem[]>([]);
