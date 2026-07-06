<script lang="ts">
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';
	import { Highlighter, AlertTriangle } from '@lucide/svelte';
	import { editorViewStore, templateFeaturesStore } from '$lib/stores/editorStore';
	import { schema } from '$lib/schema/schema';

	let { activeHighlightColor = null }: { activeHighlightColor?: string | null } = $props();

	let open = $state(false);

	const highlightDisabled = $derived($templateFeaturesStore?.highlight === false);

	const highlightColors = [
		{ name: 'Yellow', value: 'yellow' },
		{ name: 'Cyan', value: 'cyan' },
		{ name: 'Magenta', value: 'magenta' },
		{ name: 'Green', value: 'green' },
		{ name: 'Red', value: 'red' },
		{ name: 'Blue', value: 'blue' },
		{ name: 'White', value: 'white' },
		{ name: 'None', value: 'none' }
	] as const;

	function setHighlight(color: string) {
		const view = $editorViewStore;
		if (view && view.state && view.dispatch) {
			const { state, dispatch } = view;
			const { from, to } = state.selection;

			if (color === 'none') {
				dispatch(state.tr.removeMark(from, to, schema.marks.highlight));
			} else {
				const mark = schema.marks.highlight.create({ color });
				dispatch(state.tr.addMark(from, to, mark));
			}
			view.focus();
			open = false;
		}
	}
</script>

<Popover
	{open}
	onOpenChange={(e) => (open = e.open)}
	positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 } }}
	autoFocus={false}
>
	<Popover.Trigger class="toolbarButton rounded p-1 hover:bg-surface-200-800">
		<button aria-label="Highlight" title="Highlight" class="relative flex items-center">
			<Highlighter class="h-5 w-5 text-surface-800-200" />
			<!-- active-color bar is absolute so it doesn't add height and lift the icon off center -->
			<span
				class="absolute inset-x-0 -bottom-1 h-[3px] rounded-full"
				style="background-color: {activeHighlightColor && activeHighlightColor !== 'none' ? activeHighlightColor : 'transparent'};"
			></span>
		</button>
	</Popover.Trigger>

	<Portal>
		<Popover.Positioner class="z-floating-ui">
			<Popover.Content class="card bg-surface-50-950 border-surface-300-700 min-w-[140px] border p-1 shadow-lg">
				{#if highlightDisabled}
					<div class="text-warning-600 dark:text-warning-400 border-surface-300-700 flex items-start gap-2 border-b px-3 py-2 text-xs">
						<AlertTriangle class="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>Highlight won't appear in final document for this template</span>
					</div>
				{/if}
				{#each highlightColors as { name, value }}
					<button
						type="button"
						class="hover:preset-tonal-primary flex w-full items-center gap-2 rounded px-3 py-2 text-left"
						onclick={() => setHighlight(value)}
					>
						{#if value === 'none'}
							<span class="relative inline-block h-3 w-3 rounded-full border border-surface-300-700 bg-surface-100-900">
								<span class="absolute inset-0 flex items-center justify-center text-xs text-red-500">✕</span>
							</span>
						{:else}
							<span class="inline-block h-3 w-3 rounded-full border border-surface-300-700" style="background-color: {value};"></span>
						{/if}
						<span class="text-sm">{name}</span>
					</button>
				{/each}
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>
