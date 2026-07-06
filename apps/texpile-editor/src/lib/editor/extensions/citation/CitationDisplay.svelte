<script lang="ts">
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';
	import type { Node as PMNode } from 'prosemirror-model';
	import type { EditorView } from 'prosemirror-view';
	import { referenceStore } from '$lib/stores/editorStore';
	import CitationEditForm from './CitationEditForm.svelte';

	let {
		node = $bindable(),
		onUpdate,
		onChangeKey
	}: {
		node: PMNode;
		view: EditorView;
		getPos: () => number;
		onUpdate: (attrs: { prenote?: string; postnote?: string; variant?: string }) => void;
		onChangeKey: (key: string) => void;
	} = $props();

	let dropdownOpen = $state(false);

	const displayText = $derived.by(() => {
		const key = node.textContent;
		const references = $referenceStore;

		if (!references) return '(loading...)';

		const reference = references.find((ref) => ref.key === key);

		if (!reference) {
			return `(${key} not found)`;
		}

		const { prenote, postnote } = node.attrs;
		let text = `${reference.author} ${reference.year || reference.date?.slice(0, 4) || 'n.d.'}`;

		if (prenote && postnote) {
			text = `(${prenote}, ${text}, ${postnote})`;
		} else if (prenote) {
			text = `(${prenote}, ${text})`;
		} else if (postnote) {
			text = `(${text}, ${postnote})`;
		} else {
			return '(' + text + ')';
		}

		return text;
	});

	const isValid = $derived.by(() => {
		const references = $referenceStore;
		if (!references) return false;
		return references.some((ref) => ref.key === node.textContent);
	});

	// preventDefault avoids selection issues
	function handleClick(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		dropdownOpen = !dropdownOpen;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			handleClick(e);
		}
	}
</script>

<Popover
	open={dropdownOpen}
	onOpenChange={(e) => (dropdownOpen = e.open)}
	positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 } }}
>
	<Popover.Trigger class="inline-flex cursor-pointer items-center" style="font-size: 1rem;">
		<span
			class="rounded py-0.5 transition-colors"
			class:text-blue-600={isValid}
			class:dark:text-blue-400={isValid}
			class:bg-blue-50={isValid && dropdownOpen}
			class:dark:bg-blue-950={isValid && dropdownOpen}
			class:text-red-600={!isValid}
			class:dark:text-red-400={!isValid}
			class:hover:bg-blue-50={isValid}
			class:dark:hover:bg-blue-950={isValid}
			class:hover:bg-red-50={!isValid}
			class:dark:hover:bg-red-950={!isValid}
			role="button"
			tabindex="0"
			onclick={handleClick}
			onkeydown={handleKeydown}
		>
			{displayText}
		</span>
	</Popover.Trigger>

	<Portal>
		<Popover.Positioner class="z-floating-ui">
			<Popover.Content class="card bg-surface-50-950 border-surface-300-700 z-[200] min-w-[300px] border p-4 shadow-lg">
				<CitationEditForm {node} {onUpdate} {onChangeKey} bind:dropdownOpen />
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>
<!-- zero-width space so the cursor can land after the citation -->
<span style="font-size: 1rem;">&#8203;</span>
