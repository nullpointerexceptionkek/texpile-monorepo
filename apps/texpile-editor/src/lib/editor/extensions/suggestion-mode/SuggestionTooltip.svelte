<!-- Compact tooltip for accepting/rejecting suggestion marks (tracked changes) -->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		position: { x: number; y: number };
		description?: string;
		onAccept: () => void;
		onReject: () => void;
		onClose: () => void;
	}

	let { position, description, onAccept, onReject, onClose }: Props = $props();

	let boxElement: HTMLDivElement;
	let isReady = $state(false);

	// delay readiness so the opening click doesn't immediately close the tooltip
	$effect(() => {
		const timer = setTimeout(() => {
			isReady = true;
		}, 100);
		return () => clearTimeout(timer);
	});

	// clamp to the viewport, placed above the text
	$effect(() => {
		if (boxElement) {
			const rect = boxElement.getBoundingClientRect();
			const viewportWidth = window.innerWidth;

			let adjustedX = position.x;
			let adjustedY = position.y - rect.height - 8;

			if (adjustedX + rect.width > viewportWidth) {
				adjustedX = viewportWidth - rect.width - 10;
			}
			if (adjustedX < 10) {
				adjustedX = 10;
			}

			// no room above, show below instead
			if (adjustedY < 10) {
				adjustedY = position.y + 8;
			}

			boxElement.style.left = `${adjustedX}px`;
			boxElement.style.top = `${adjustedY}px`;
		}
	});

	function handleMouseDown(e: MouseEvent) {
		// keep mousedown from stealing focus from the editor
		e.preventDefault();
		e.stopPropagation();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleWindowClick(e: MouseEvent) {
		if (boxElement && boxElement.contains(e.target as Node)) {
			return;
		}
		if (isReady) {
			onClose();
		}
	}

	function handleScroll() {
		onClose();
	}

	// close on scroll of the editor or any scrollable ancestor, the fixed tooltip would drift
	$effect(() => {
		const prosemirror = document.querySelector('.ProseMirror');
		if (prosemirror) {
			const scrollableElements = [prosemirror];
			let parent = prosemirror.parentElement;

			while (parent) {
				const style = window.getComputedStyle(parent);
				const overflow = style.overflow;
				const overflowY = style.overflowY;
				if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
					scrollableElements.push(parent);
				}
				parent = parent.parentElement;
			}

			scrollableElements.forEach((el) => {
				el.addEventListener('scroll', handleScroll, { passive: true });
			});

			return () => {
				scrollableElements.forEach((el) => {
					el.removeEventListener('scroll', handleScroll);
				});
			};
		}
	});
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div
	bind:this={boxElement}
	class="bg-surface-50-950 border-surface-300-700 z-tooltip fixed flex items-center gap-1 rounded-lg border px-1.5 py-1 shadow-md"
	style="pointer-events: auto;"
	onmousedown={handleMouseDown}
	role="toolbar"
	aria-label={m.suggestmode_actions_label()}
	tabindex="-1"
	transition:fly={{ y: -4, duration: 150, easing: quintOut }}
>
	{#if description}
		<span class="text-surface-500-400 whitespace-nowrap px-1 text-xs">{description}</span>
		<span class="bg-surface-300-700 h-4 w-px"></span>
	{/if}
	<button
		type="button"
		class="flex h-6 w-6 items-center justify-center rounded-full text-green-700 transition-colors hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/40"
		onclick={onAccept}
		onmousedown={handleMouseDown}
		title={m.suggestmode_accept()}
		aria-label={m.suggestmode_accept()}
	>
		<Check class="h-3.5 w-3.5" />
	</button>
	<button
		type="button"
		class="flex h-6 w-6 items-center justify-center rounded-full text-red-700 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
		onclick={onReject}
		onmousedown={handleMouseDown}
		title={m.suggestmode_reject()}
		aria-label={m.suggestmode_reject()}
	>
		<X class="h-3.5 w-3.5" />
	</button>
</div>
