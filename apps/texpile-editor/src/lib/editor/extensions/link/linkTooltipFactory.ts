// mounts the link tooltip; same pattern as harper/suggestionBoxFactory.ts
import { mount, unmount } from 'svelte';
import LinkTooltip from './LinkTooltip.svelte';

interface Position {
	x: number;
	y: number;
}

export interface LinkTooltipOptions {
	href: string;
	title: string | null;
	linkText: string;
	position: Position;
	onUpdate: (href: string, title: string | null) => void;
	onRemove: () => void;
	onClose: () => void;
}

let currentContainer: HTMLDivElement | null = null;
let currentComponent: ReturnType<typeof mount> | null = null;

export function createLinkTooltip(options: LinkTooltipOptions): void {
	destroyLinkTooltip();

	currentContainer = document.createElement('div');
	currentContainer.id = 'link-tooltip-container';
	currentContainer.style.position = 'fixed';
	currentContainer.style.zIndex = '999999';
	currentContainer.style.pointerEvents = 'none';
	currentContainer.style.top = '0';
	currentContainer.style.left = '0';
	currentContainer.style.width = '100%';
	currentContainer.style.height = '100%';
	document.body.appendChild(currentContainer);

	try {
		currentComponent = mount(LinkTooltip, {
			target: currentContainer,
			props: {
				href: options.href,
				title: options.title,
				linkText: options.linkText,
				position: options.position,
				onUpdate: options.onUpdate,
				onRemove: options.onRemove,
				onClose: options.onClose
			}
		});
	} catch (error) {
		console.error('[LinkTooltip] Error mounting component:', error);
		destroyLinkTooltip();
	}
}

export function destroyLinkTooltip(): void {
	if (currentComponent) {
		try {
			unmount(currentComponent);
		} catch (error) {
			console.error('[LinkTooltip] Error unmounting component:', error);
		}
		currentComponent = null;
	}

	if (currentContainer && currentContainer.parentNode) {
		currentContainer.parentNode.removeChild(currentContainer);
		currentContainer = null;
	}
}
