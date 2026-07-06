import type { Command, EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { suggestionPluginKey } from './key';

export const setSuggestionModeCommand = (enabled: boolean): Command => {
	return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
		const pluginState = suggestionPluginKey.getState(state);
		if (!pluginState) return false;

		if (dispatch) {
			dispatch(
				state.tr.setMeta(suggestionPluginKey, {
					...pluginState,
					inSuggestionMode: enabled
				})
			);
		}
		return true;
	};
};

export const toggleSuggestionMode: Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
	const pluginState = suggestionPluginKey.getState(state);
	if (!pluginState) return false;
	return setSuggestionModeCommand(!pluginState.inSuggestionMode)(state, dispatch);
};

/** non-command version for direct view use. */
export const setSuggestionMode = (view: EditorView, enabled: boolean): boolean => {
	return setSuggestionModeCommand(enabled)(view.state, view.dispatch);
};
