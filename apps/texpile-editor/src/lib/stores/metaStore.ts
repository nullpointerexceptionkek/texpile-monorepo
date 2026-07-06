import { writable } from 'svelte/store';

export const currentDocMetaStore = writable<App.DocMeta | null>(null);
