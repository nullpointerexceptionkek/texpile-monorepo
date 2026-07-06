import { createProofreadPlugin, createSpellCheckEnabledStore } from 'prosemirror-proofread';
import { lintText, syncDocumentDictionary } from '$lib/editor/extensions/harper/linter';
import { createHarperSuggestionBox } from '$lib/editor/extensions/harper/suggestionBoxFactory';
import './suggestion.css';
import { editorConfigStore } from '$lib/stores/editorStore';

const spellcheckenabled = createSpellCheckEnabledStore(() => false);

editorConfigStore.subscribe((value) => {
	spellcheckenabled.set(value?.spellcheck ?? false);

	// guard on a NON-EMPTY dictionary so the empty default doesn't boot the harper WASM worker
	// on every load; it boots lazily on the first lint once spell-check is enabled
	if (value?.dictionary?.length) {
		syncDocumentDictionary().catch((error) => {
			console.error('[Harper] Failed to sync dictionary:', error);
		});
	}
});

export const proofreadPlugin = createProofreadPlugin(
	500,
	lintText,
	createHarperSuggestionBox,
	spellcheckenabled,
	undefined, // getCustomText
	true // useCustomCSS: enables the proofread-* class naming
);
