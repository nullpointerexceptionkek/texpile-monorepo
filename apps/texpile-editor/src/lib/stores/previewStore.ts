import { writable } from 'svelte/store';
import { preferences } from './preferencesStore.svelte';

// isVisible is mirrored into preferences for persistence
function createPreviewStore() {
	const { subscribe, set, update } = writable({
		isVisible: preferences.previewVisible
	});

	return {
		subscribe,
		set: (value: { isVisible: boolean }) => {
			preferences.previewVisible = value.isVisible;
			set(value);
		},
		update: (fn: (state: { isVisible: boolean }) => { isVisible: boolean }) => {
			update((state) => {
				const newState = fn(state);
				preferences.previewVisible = newState.isVisible;
				return newState;
			});
		}
	};
}

export const previewStore = createPreviewStore();
