import { mount, unmount } from 'svelte';
import SuggestionTooltip from './SuggestionTooltip.svelte';

export interface SuggestionTooltipOptions {
	position: { x: number; y: number };
	description?: string;
	onAccept: () => void;
	onReject: () => void;
	onClose: () => void;
}

let currentContainer: HTMLDivElement | null = null;
let currentComponent: ReturnType<typeof mount> | null = null;

export function createSuggestionTooltip(options: SuggestionTooltipOptions): void {
	destroySuggestionTooltip();

	currentContainer = document.createElement('div');
	currentContainer.id = 'suggestion-tooltip-container';
	currentContainer.style.position = 'fixed';
	currentContainer.style.zIndex = '999999';
	currentContainer.style.pointerEvents = 'none';
	currentContainer.style.top = '0';
	currentContainer.style.left = '0';
	currentContainer.style.width = '100%';
	currentContainer.style.height = '100%';
	document.body.appendChild(currentContainer);

	try {
		currentComponent = mount(SuggestionTooltip, {
			target: currentContainer,
			props: {
				position: options.position,
				description: options.description,
				onAccept: options.onAccept,
				onReject: options.onReject,
				onClose: options.onClose
			}
		});
	} catch (error) {
		console.error('[SuggestionTooltip] Error mounting component:', error);
		destroySuggestionTooltip();
	}
}

export function destroySuggestionTooltip(): void {
	if (currentComponent) {
		try {
			unmount(currentComponent);
		} catch (error) {
			console.error('[SuggestionTooltip] Error unmounting component:', error);
		}
		currentComponent = null;
	}

	if (currentContainer?.parentNode) {
		currentContainer.parentNode.removeChild(currentContainer);
		currentContainer = null;
	}
}

export function isSuggestionTooltipVisible(): boolean {
	return currentContainer !== null;
}
