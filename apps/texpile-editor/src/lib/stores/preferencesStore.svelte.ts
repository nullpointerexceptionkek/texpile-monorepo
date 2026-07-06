import { browser } from '$lib/runtime';

const STORAGE_KEY = 'texpile:preferences';

export interface EditorPreferences {
	/** editor zoom level (1 = 100%). */
	zoom: number;
	/** renders the editor in a paper-like container. */
	pageView: boolean;
	previewVisible: boolean;
	sidebarOpen: boolean;
	advancedWarningDismissed: boolean;
	onboardingCompleted: boolean;
	tourCompleted: boolean;
}

const DEFAULT_PREFERENCES: EditorPreferences = {
	zoom: 1,
	pageView: false,
	previewVisible: true,
	sidebarOpen: true, // sidebarStore overrides on mobile
	advancedWarningDismissed: false,
	onboardingCompleted: false,
	tourCompleted: false
};

function loadFromStorage(): EditorPreferences {
	if (!browser) return DEFAULT_PREFERENCES;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// merge with defaults for keys missing from older versions
			return { ...DEFAULT_PREFERENCES, ...parsed };
		}
	} catch (e) {
		console.warn('Failed to load preferences from localStorage:', e);
	}

	return DEFAULT_PREFERENCES;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function saveToStorage(prefs: EditorPreferences): void {
	if (!browser) return;

	if (saveTimeout) clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
		} catch (e) {
			console.warn('Failed to save preferences to localStorage:', e);
		}
	}, 100);
}

const initialPrefs = loadFromStorage();

export const preferences = $state<EditorPreferences>(initialPrefs);

// auto-save on change
$effect.root(() => {
	$effect(() => {
		// touch every field so the effect tracks them all
		const snapshot = {
			zoom: preferences.zoom,
			pageView: preferences.pageView,
			previewVisible: preferences.previewVisible,
			sidebarOpen: preferences.sidebarOpen,
			advancedWarningDismissed: preferences.advancedWarningDismissed,
			onboardingCompleted: preferences.onboardingCompleted,
			tourCompleted: preferences.tourCompleted
		};
		saveToStorage(snapshot);
	});
});
