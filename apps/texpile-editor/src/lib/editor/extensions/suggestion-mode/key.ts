import { PluginKey } from 'prosemirror-state';

export interface SuggestionModePluginState {
	inSuggestionMode: boolean;
}

// global plugin state
export const suggestionPluginKey = new PluginKey<SuggestionModePluginState>('suggestion-mode');

// per-transaction hints, temporarily override the global state
export const suggestionTransactionKey = new PluginKey<SuggestionModePluginState & { skipSuggestionOperation?: boolean; username?: string }>(
	'suggestion-mode-transaction'
);
