<script lang="ts">
	import Link2 from '@lucide/svelte/icons/link-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		href: string;
		title: string | null;
		linkText: string;
		position: { x: number; y: number };
		onUpdate: (href: string, title: string | null) => void;
		onRemove: () => void;
		onClose: () => void;
	}

	let { href, title, position, onUpdate, onRemove, onClose }: Props = $props();

	let boxElement: HTMLDivElement;
	let isReady = $state(false);
	let isEditing = $state(false);

	// edit fields are seeded once by design: the tooltip is remounted per link
	// svelte-ignore state_referenced_locally
	let editHref = $state(href);
	// svelte-ignore state_referenced_locally
	let editTitle = $state(title || '');

	// delay the window click handler so the opening click doesn't instantly close the tooltip
	$effect(() => {
		const timer = setTimeout(() => {
			isReady = true;
		}, 100);
		return () => clearTimeout(timer);
	});

	// keep the box within the viewport
	$effect(() => {
		if (boxElement) {
			const rect = boxElement.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			let adjustedX = position.x;
			let adjustedY = position.y + 8;

			if (adjustedX + rect.width > viewportWidth) {
				adjustedX = viewportWidth - rect.width - 10;
			}
			if (adjustedX < 10) {
				adjustedX = 10;
			}

			// show above if no room below
			if (adjustedY + rect.height > viewportHeight) {
				adjustedY = position.y - rect.height - 8;
			}
			if (adjustedY < 10) {
				adjustedY = 10;
			}

			boxElement.style.left = `${adjustedX}px`;
			boxElement.style.top = `${adjustedY}px`;
		}
	});

	function handleSave() {
		if (editHref.trim()) {
			onUpdate(editHref.trim(), editTitle.trim() || null);
		}
	}

	function handleCancel() {
		isEditing = false;
		editHref = href;
		editTitle = title || '';
	}

	function handleRemove() {
		onRemove();
	}

	function handleOpenLink() {
		window.open(href, '_blank', 'noopener,noreferrer');
	}

	function handleClick(e: MouseEvent) {
		// don't let the click bubble to the editor
		e.stopPropagation();
	}

	function handleMouseDown(e: MouseEvent) {
		// keep mousedown from stealing editor focus, but let inputs take clicks
		const target = e.target as HTMLElement;
		if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
			e.preventDefault();
		}
		e.stopPropagation();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (isEditing) {
				handleCancel();
			} else {
				onClose();
			}
		} else if (e.key === 'Enter' && isEditing) {
			e.preventDefault();
			handleSave();
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

	// close on scroll of the editor or any scrollable ancestor
	$effect(() => {
		const prosemirror = document.querySelector('.ProseMirror');
		if (prosemirror) {
			const scrollableElements = [prosemirror];
			let parent = prosemirror.parentElement;

			while (parent) {
				const overflow = window.getComputedStyle(parent).overflow;
				const overflowY = window.getComputedStyle(parent).overflowY;
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
	class="card bg-surface-50-950 border-surface-300-700 z-tooltip fixed border shadow-lg"
	style="min-width: 280px; max-width: 400px; pointer-events: auto;"
	onclick={handleClick}
	onmousedown={handleMouseDown}
	onkeydown={handleKeydown}
	role="dialog"
	aria-label="Edit link"
	tabindex="-1"
	transition:fly={{ y: -4, duration: 150, easing: quintOut }}
>
	{#if isEditing}
		<div class="space-y-3 p-3">
			<label class="block">
				<span class="text-surface-900-100 text-sm font-medium">URL</span>
				<input type="url" bind:value={editHref} placeholder="https://example.com" class="input mt-1 w-full text-sm" />
			</label>

			<label class="block">
				<span class="text-surface-900-100 text-sm font-medium">Title</span>
				<span class="text-surface-500-400 ml-1 text-xs">(optional)</span>
				<input type="text" bind:value={editTitle} placeholder="Link title for accessibility" class="input mt-1 w-full text-sm" />
			</label>

			<div class="flex justify-end gap-2 pt-1">
				<button type="button" class="btn btn-sm preset-outlined hover:preset-tonal" onclick={handleCancel}>
					<X class="h-4 w-4" />
					<span>Cancel</span>
				</button>
				<button type="button" class="btn btn-sm preset-filled-primary-500" onclick={handleSave} disabled={!editHref.trim()}>
					<Check class="h-4 w-4" />
					<span>Save</span>
				</button>
			</div>
		</div>
	{:else}
		<div class="p-2">
			<div class="mb-2 flex items-center gap-2 p-1">
				<Link2 class="text-surface-500-400 h-4 w-4 flex-shrink-0" />
				<a {href} target="_blank" rel="noopener noreferrer" class="anchor flex-1 truncate text-sm" title={href}>
					{title || href}
				</a>
			</div>

			<div class="border-surface-300-700 flex items-center gap-1 border-t pt-2">
				<button
					type="button"
					class="btn btn-sm preset-tonal hover:preset-filled flex-1"
					onclick={() => (isEditing = true)}
					title="Edit link"
				>
					<Pencil class="h-4 w-4" />
					<span>Edit</span>
				</button>
				<button type="button" class="btn btn-sm preset-tonal hover:preset-filled flex-1" onclick={handleOpenLink} title="Open in new tab">
					<ExternalLink class="h-4 w-4" />
					<span>Open</span>
				</button>
				<button
					type="button"
					class="btn btn-sm preset-tonal-error hover:preset-filled-error-500"
					onclick={handleRemove}
					title="Remove link"
				>
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/if}
</div>
