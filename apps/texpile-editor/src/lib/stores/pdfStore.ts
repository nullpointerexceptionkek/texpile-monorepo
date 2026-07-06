import { writable } from 'svelte/store';

type PdfData = ArrayBuffer | string | null;
type RefreshFn = (() => Promise<string | null>) | null;

function createPdfStore() {
	const { subscribe, set, update } = writable<PdfData>(null);
	let refreshFn: RefreshFn = null;

	return {
		subscribe,
		set,
		update,
		setRefreshFn: (fn: RefreshFn) => {
			refreshFn = fn;
		},
		// call when a PDF fetch fails, re-resolves the URL
		refresh: async (): Promise<string | null> => {
			if (refreshFn) {
				return refreshFn();
			}
			return null;
		}
	};
}

// raw PDF bytes (ArrayBuffer) or a direct URL string; null when unset
export const pdfStore = createPdfStore();

export const currentlyCompilingStore = writable(false);
