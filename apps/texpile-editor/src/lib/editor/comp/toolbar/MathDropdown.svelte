<script lang="ts">
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';
	import { SquareRadical, ChevronDown } from '@lucide/svelte';
	import { createMathField } from '$lib/editor/extensions/mathlivebridge/mlcommands';
	import { editorViewStore } from '$lib/stores/editorStore';
	import Kbd from '$lib/components/Kbd.svelte';

	let open = $state(false);

	const mathOptions = [
		{
			id: 'inline',
			label: 'Inline Math',
			shortcut: 'Mod+M',
			command: createMathField(false)
		},
		{
			id: 'block',
			label: 'Block Math',
			shortcut: 'Mod+Shift+M',
			command: createMathField(true)
		}
	];

	function handleInsert(option: (typeof mathOptions)[0]) {
		const view = $editorViewStore;
		if (view && view.state && view.dispatch) {
			const success = option.command(view.state, view.dispatch);
			if (success) {
				view.focus();
				open = false;
			}
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
		<button aria-label="Insert math" title="Insert math" class="flex items-center gap-0.5">
			<SquareRadical class="h-5 w-5 text-surface-800-200" />
			<ChevronDown class="text-surface-500 size-3 shrink-0" />
		</button>
	</Popover.Trigger>

	<Portal>
		<Popover.Positioner class="z-floating-ui">
			<Popover.Content class="card bg-surface-50-950 border-surface-300-700 min-w-[180px] border p-1 shadow-lg">
				{#each mathOptions as option}
					<button
						type="button"
						class="hover:preset-tonal-primary flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left"
						onclick={() => handleInsert(option)}
					>
						<span class="text-sm">{option.label}</span>
						<Kbd keys={option.shortcut} />
					</button>
				{/each}
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>
