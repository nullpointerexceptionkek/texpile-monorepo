// seeds editorConfigStore (spell-check toggle + custom dictionary) from app settings and mirrors
// changes back into settings so they persist.
import { get } from 'svelte/store';
import { editorConfigStore } from '$lib/stores/editorStore';
import type { EditorConfiguration } from '$lib/types/editorcfg';
import { loadSettings, updateSettings, settings } from '$lib/settings';

// collaboration/transpileTemplate are required by the type but unused here
const DEFAULT_CONFIG: EditorConfiguration = {
	dictionary: [],
	spellcheck: false,
	transpileTemplate: '',
	collaboration: { anyone: 'none', editors: [] }
};

let initialized = false;

/** seeds editorConfigStore from settings and persists toggle/dictionary changes back. idempotent. */
export async function initSpellcheckConfig(): Promise<void> {
	if (initialized) return;
	initialized = true;

	const s = await loadSettings();
	editorConfigStore.set({ ...DEFAULT_CONFIG, spellcheck: s.spellcheck, dictionary: s.dictionary });

	editorConfigStore.subscribe((c) => {
		if (!c) return;
		const cur = get(settings);
		if (c.spellcheck !== cur.spellcheck || c.dictionary !== cur.dictionary) {
			updateSettings({ spellcheck: c.spellcheck, dictionary: c.dictionary });
		}
	});
}

export function setSpellcheckEnabled(enabled: boolean): void {
	editorConfigStore.update((c) => ({ ...(c ?? DEFAULT_CONFIG), spellcheck: enabled }));
}
