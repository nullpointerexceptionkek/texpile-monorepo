<script lang="ts">
	import { editorViewStore, templateFeaturesStore } from '$lib/stores/editorStore';
	import { Popover, Portal, Switch, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { Table } from '@lucide/svelte';
	import { createTableNode } from '$lib/editor/utils/tableUtils';

	const maxRows = 10;
	const maxCols = 10;

	let open = $state(false);
	let hoveredCells = $state({ rows: 1, cols: 1 });

	const tableCaptionEnabled = $derived($templateFeaturesStore?.tableCaption ?? true);

	let numberedState = $state(true); // user's preference while enabled
	let numbered = $derived(tableCaptionEnabled ? numberedState : false);

	function isCellHighlighted(row, col) {
		return row <= hoveredCells.rows && col <= hoveredCells.cols;
	}

	let highlightedCells = $state(getHighlightedCells());

	function getHighlightedCells() {
		let cells = [];
		for (let row = 1; row <= maxRows; row++) {
			for (let col = 1; col <= maxCols; col++) {
				cells.push({ row, col, highlighted: isCellHighlighted(row, col) });
			}
		}
		return cells;
	}
	function handleMouseOver(row, col) {
		hoveredCells = { rows: row, cols: col };
		highlightedCells = getHighlightedCells();
	}

	function insertTable() {
		if (!$editorViewStore.state || !$editorViewStore.dispatch) {
			console.error('Editor state or dispatch function is not available');
			return;
		}
		const { state, dispatch } = $editorViewStore;
		let tr = state.tr;
		const tableNode = createTableNode(state.schema, hoveredCells.rows, hoveredCells.cols, numbered);
		const insertPos = tr.selection.from;
		tr = tr.insert(insertPos, tableNode);
		dispatch(tr);
		$editorViewStore.focus();
		open = false;
	}
</script>

<Popover {open} onOpenChange={(e) => (open = e.open)} positioning={{ placement: 'bottom-start', offset: { mainAxis: 0 } }}>
	<Popover.Trigger class="toolbarButton rounded p-1 hover:bg-surface-200-800">
		<button aria-label="Insert table" title="Insert table" class="flex items-center justify-center">
			<Table class="h-5 w-5 text-surface-800-200" />
		</button>
	</Popover.Trigger>

	<Portal>
		<Popover.Positioner class="z-floating-ui">
			<Popover.Content class="card bg-surface-50-950 border-surface-300-700 border p-3 shadow-lg">
				<p class="mb-2 text-center text-sm">{hoveredCells.rows}x{hoveredCells.cols}</p>
				<div class="mb-3 grid grid-cols-10 gap-1">
					{#each highlightedCells as cell}
						<button
							type="button"
							class="h-6 w-6 rounded"
							class:bg-surface-200-800={!cell.highlighted}
							class:bg-blue={cell.highlighted}
							onmouseenter={() => handleMouseOver(cell.row, cell.col)}
							onfocus={() => handleMouseOver(cell.row, cell.col)}
							onclick={insertTable}
							aria-label={`Insert ${cell.row}x${cell.col} table`}
						></button>
					{/each}
				</div>

				{#if tableCaptionEnabled}
					<Switch
						name="numbered-table"
						checked={numberedState}
						onCheckedChange={(e) => (numberedState = e.checked)}
						class="flex cursor-pointer items-center justify-between text-sm"
					>
						<Switch.Label>Numbered table</Switch.Label>
						<Switch.Control class="preset-filled-surface-200-700 data-[state=checked]:preset-filled-primary-500">
							<Switch.Thumb />
						</Switch.Control>
						<Switch.HiddenInput />
					</Switch>
				{:else}
					<Tooltip positioning={{ placement: 'top' }} openDelay={200}>
						<Tooltip.Trigger class="w-full">
							<Switch
								name="numbered-table"
								checked={false}
								disabled
								class="flex cursor-not-allowed items-center justify-between text-sm opacity-50"
							>
								<Switch.Label>Numbered table</Switch.Label>
								<Switch.Control class="preset-filled-surface-200-700">
									<Switch.Thumb />
								</Switch.Control>
								<Switch.HiddenInput />
							</Switch>
						</Tooltip.Trigger>
						<Portal>
							<Tooltip.Positioner class="z-floating-ui">
								<Tooltip.Content class="card preset-filled p-2 text-sm">This feature is not enabled for this template</Tooltip.Content>
							</Tooltip.Positioner>
						</Portal>
					</Tooltip>
				{/if}
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>
