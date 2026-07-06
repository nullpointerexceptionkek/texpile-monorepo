// mounts the svelte suggestion box for prosemirror-proofread
import { mount, unmount } from 'svelte';
import SuggestionBox from './SuggestionBox.svelte';

// shapes match prosemirror-proofread
interface Position {
	x: number;
	y: number;
}

type OnReplaceCallback = (value: string) => void;
type OnIgnoreCallback = () => void;
type OnCloseCallback = () => void;
type OnInvalidateCacheCallback = () => void;

export interface Problem {
	from: number;
	to: number;
	msg: string;
	shortmsg: string;
	type: string;
	replacements: string[];
	text: string; // the error text itself
}

export interface SuggestionBoxOptions {
	error: Problem;
	errors: Problem[]; // all errors in this segment (overlaps)
	position: Position;
	onReplace: OnReplaceCallback;
	onIgnore: OnIgnoreCallback;
	onClose: OnCloseCallback;
	invalidateCache: OnInvalidateCacheCallback; // force re-check after dictionary changes
}

let currentCleanup: (() => void) | null = null;

export function createHarperSuggestionBox(options: SuggestionBoxOptions): { destroy: () => void } {
	if (currentCleanup) {
		currentCleanup();
		currentCleanup = null;
	}

	const container = document.createElement('div');
	container.id = 'harper-suggestion-container';
	container.style.position = 'fixed';
	container.style.zIndex = '999999';
	container.style.pointerEvents = 'none';
	container.style.top = '0';
	container.style.left = '0';
	container.style.width = '100%';
	container.style.height = '100%';
	document.body.appendChild(container);

	let component;
	try {
		component = mount(SuggestionBox, {
			target: container,
			props: {
				error: options.error,
				errors: options.errors || [options.error],
				position: options.position,
				onReplace: (value: string) => {
					options.onReplace(value);
					destroy();
				},
				onIgnore: () => {
					options.onIgnore();
					destroy();
				},
				onClose: () => {
					options.onClose();
					destroy();
				},
				invalidateCache: options.invalidateCache
			}
		});
	} catch (error) {
		console.error('[Harper] Error mounting component:', error);
	}

	function destroy() {
		if (container && container.parentNode) {
			if (component) {
				unmount(component);
			}
			container.parentNode.removeChild(container);
		}
		if (currentCleanup === destroy) {
			currentCleanup = null;
		}
	}

	currentCleanup = destroy;

	return { destroy };
}
