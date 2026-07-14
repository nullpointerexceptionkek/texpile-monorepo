<script lang="ts">
	import { Popover, Portal, Switch, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import {
		Settings,
		ChevronDown,
		AlertCircle,
		Info,
		AlignLeft,
		AlignCenter,
		AlignRight,
		WrapText,
		StretchHorizontal
	} from '@lucide/svelte';
	import type { Node } from 'prosemirror-model';
	import { sanitizeLabel } from '$lib/editor/utils/label';
	import { isReadOnly } from '$lib/stores/permissionStore';
	import { templateFeaturesStore } from '$lib/stores/editorStore';
	import { parseColspec, generateColspec, type ColAlign } from '$lib/latex-parser/colspec';

	interface Props {
		tableNumber: number;
		sectionNumber: string | null;
		node: Node;
		updateAttrs: (attrs: Partial<typeof node.attrs>) => void;
		checkDuplicate: (label: string) => boolean;
		// per-row latex rules (\hline etc.): one string before each row + one after the last row
		rowRules: string[];
		bottomRule: string;
		setRowRule: (rowIndex: number, rule: string) => void;
		setBottomRule: (rule: string) => void;
		// column spec (e.g. "|l|c|p{3cm}|") + the env (X is offered only for tabularx)
		colspec: string;
		tableEnv: string;
		setColspec: (spec: string) => void;
	}

	let {
		tableNumber,
		// not yet consulted, reserved for hierarchical numbering (see the commented-out tableDisplay below)
		sectionNumber: _sectionNumber,
		node,
		updateAttrs,
		checkDuplicate,
		rowRules,
		bottomRule,
		setRowRule,
		setBottomRule,
		colspec,
		tableEnv,
		setColspec
	}: Props = $props();

	const ALIGN_ICONS = [
		{ value: 'l' as ColAlign, icon: AlignLeft, title: 'Left' },
		{ value: 'c' as ColAlign, icon: AlignCenter, title: 'Center' },
		{ value: 'r' as ColAlign, icon: AlignRight, title: 'Right' },
		{ value: 'p' as ColAlign, icon: WrapText, title: 'Paragraph (fixed width)' },
		{ value: 'X' as ColAlign, icon: StretchHorizontal, title: 'Stretch (X)', tabularx: true }
	];
	// columns the table actually has (first row's colspans summed)
	const columnCount = $derived.by(() => {
		let table: Node | null = null;
		node.forEach((c) => {
			if (c.type.name === 'table') table = c as Node;
		});
		if (!table || (table as Node).childCount === 0) return 0;
		let w = 0;
		(table as Node).child(0).forEach((cell) => (w += Number(cell.attrs.colspan ?? 1)));
		return w;
	});
	const isTabularx = $derived(tableEnv === 'tabularx' || tableEnv === 'tabulary');
	// the captured spec, or a default (all centred) for editor-created tables
	const effectiveColspec = $derived(colspec && colspec.trim() ? colspec : 'c'.repeat(columnCount));
	const colModel = $derived(parseColspec(effectiveColspec));
	const verticalLines = $derived(!!colModel && colModel.rules.length > 1 && colModel.rules.every(Boolean));

	// p/m/b all read as the paragraph icon; C reads as the X icon
	const activeAlign = (a: ColAlign): ColAlign => (a === 'm' || a === 'b' ? 'p' : a === 'C' ? 'X' : a);

	function setAlign(i: number, align: ColAlign) {
		if (!colModel) return;
		const columns = colModel.columns.map((c, j) => {
			if (j !== i) return c;
			const isPara = align === 'p' || align === 'm' || align === 'b';
			return { align, width: isPara ? (c.width ?? '2cm') : undefined };
		});
		setColspec(generateColspec({ ...colModel, columns }));
	}
	function setWidth(i: number, width: string) {
		if (!colModel) return;
		const columns = colModel.columns.map((c, j) => (j === i ? { ...c, width } : c));
		setColspec(generateColspec({ ...colModel, columns }));
	}
	function setVerticalLines(on: boolean) {
		if (!colModel) return;
		setColspec(generateColspec({ columns: colModel.columns, rules: colModel.rules.map(() => on) }));
	}

	const tableCaptionEnabled = $derived($templateFeaturesStore?.tableCaption ?? true);
	const tableNotesEnabled = $derived($templateFeaturesStore?.tableNotes ?? true);
	const columnSpanningEnabled = $derived($templateFeaturesStore?.columnSpanningFigures ?? false);

	let settingsOpen = $state(false);
	let showAdvanced = $state(false);
	let tooltipOpen = $state(false);

	// first-paint snapshot by design, re-synced by the $effect below when the node prop changes
	// svelte-ignore state_referenced_locally
	const initialAttrs = node?.attrs;
	let labelInput = $state(initialAttrs?.label || '');
	let showNotesInput = $state(initialAttrs?.showNotes || false);
	let spanningInput = $state(initialAttrs?.spanning || false);

	// original label, used to revert invalid edits
	const originalTexpileLabel = initialAttrs?.label || '';

	// re-sync when the node changes externally
	$effect(() => {
		labelInput = node?.attrs?.label || '';
		showNotesInput = node?.attrs?.showNotes || false;
		spanningInput = node?.attrs?.spanning || false;
	});

	// validate the label when the popover closes
	$effect(() => {
		if (!settingsOpen) {
			validateAndFixLabel();
		}
	});

	let isDuplicate = $derived(labelInput && !isTexpileManagedLabel(labelInput) && checkDuplicate(labelInput));

	function isTexpileManagedLabel(label: string | null): boolean {
		if (!label) return false;
		return label.startsWith('texpile-table-');
	}

	// display number is calculated (updates when the table moves); the label is only for \ref
	let tableDisplay = $derived(`Table ${tableNumber}`);

	let hasPlaceholderCaption = $derived.by(() => {
		if (!node.content || node.content.childCount === 0) return false;
		const captionNode = node.content.child(0); // table_caption is first child
		if (!captionNode || captionNode.type.name !== 'table_caption') return false;

		if (captionNode.content.size === 0) return true;

		const captionText = captionNode.textContent.trim();
		return captionText === '' || captionText === 'Table caption';
	});

	// FUTURE: Restore for hierarchical numbering (Table 1.1, 1.2, 2.1...)
	/*
	let tableDisplay = $derived(
		sectionNumber 
			? `Table ${sectionNumber}.${tableNumber}`
			: `Table ${tableNumber}`
	);
	*/

	function validateAndFixLabel() {
		const currentLabel = sanitizeLabel(labelInput);

		if (!currentLabel || checkDuplicate(currentLabel)) {
			labelInput = originalTexpileLabel;
			updateAttrs({ label: originalTexpileLabel });
		}
	}

	function handleLabelInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const newLabel = sanitizeLabel(input.value);
		labelInput = newLabel;
		// don't update attrs yet, wait for blur to validate
	}

	function handleLabelBlur(e: Event) {
		const input = e.target as HTMLInputElement;
		const newLabel = sanitizeLabel(input.value);

		if (!newLabel) {
			labelInput = originalTexpileLabel;
			updateAttrs({ label: originalTexpileLabel });
			return;
		}

		if (checkDuplicate(newLabel)) {
			labelInput = originalTexpileLabel;
			updateAttrs({ label: originalTexpileLabel });
			return;
		}

		updateAttrs({ label: newLabel });
	}

	function handleNotesToggle(details: { checked: boolean }) {
		showNotesInput = details.checked;
		updateAttrs({ showNotes: details.checked });
	}

	function handleSpanningToggle(details: { checked: boolean }) {
		spanningInput = details.checked;
		updateAttrs({ spanning: details.checked });
	}
</script>

<div class="table-header-container">
	{#if !tableCaptionEnabled}
		<div class="table-caption-warning">
			<AlertCircle class="h-4 w-4" />
			<span>Numbered tables are not supported by this template. The caption and numbering won't appear in the output.</span>
		</div>
	{/if}
	<div class="table-header">
		<div class="table-number-row">
			<div class="table-number">{tableDisplay}</div>
			{#if hasPlaceholderCaption}
				<Tooltip open={tooltipOpen} onOpenChange={(e) => (tooltipOpen = e.open)} positioning={{ placement: 'top' }} openDelay={200}>
					<Tooltip.Trigger class="flex items-center">
						<AlertCircle class="text-warning-500 h-4 w-4" />
					</Tooltip.Trigger>
					<Tooltip.Content class="card preset-filled p-2 text-sm">A caption is required for numbered tables.</Tooltip.Content>
				</Tooltip>
			{/if}
		</div>

		<Popover
			open={settingsOpen}
			onOpenChange={(e) => (settingsOpen = e.open)}
			positioning={{ placement: 'bottom-end', offset: { mainAxis: 4 } }}
		>
			<Popover.Trigger class="table-settings-btn">
				<button aria-label="Table settings" title="Table settings" type="button" disabled={$isReadOnly}>
					<Settings class="h-4 w-4" />
				</button>
			</Popover.Trigger>

			<Portal>
				<Popover.Positioner class="z-floating-ui">
					<Popover.Content class="card bg-surface-50-950 border-surface-300-700 min-w-[250px] border shadow-lg">
						<div class="settings-content">
							{#if colModel && colModel.columns.length > 0}
								<div class="settings-row">
									<div class="text-surface-700-300 mb-1.5 text-xs font-semibold">Columns</div>
									{#each colModel.columns as col, i (i)}
										<div class="mb-1 flex items-center gap-2">
											<span class="text-surface-400 w-4 text-right text-xs">{i + 1}</span>
											<div class="border-surface-300-700 flex overflow-hidden rounded-base border">
												{#each ALIGN_ICONS as opt (opt.value)}
													{#if !opt.tabularx || isTabularx}
														<button
															type="button"
															title={opt.title}
															aria-label={opt.title}
															class="hover:preset-tonal p-1 {activeAlign(col.align) === opt.value ? 'preset-filled-primary-500' : ''}"
															onclick={() => setAlign(i, opt.value)}
														>
															<opt.icon class="size-3.5" />
														</button>
													{/if}
												{/each}
											</div>
											{#if col.align === 'p' || col.align === 'm' || col.align === 'b'}
												<input
													class="input w-16 px-1.5 py-0.5 text-xs"
													value={col.width ?? ''}
													placeholder="3cm"
													aria-label="Column {i + 1} width"
													onchange={(e) => setWidth(i, (e.currentTarget as HTMLInputElement).value)}
												/>
											{/if}
										</div>
									{/each}
									<Switch
										checked={verticalLines}
										onCheckedChange={(e) => setVerticalLines(e.checked)}
										class="mt-2 flex items-center justify-between gap-3"
									>
										<Switch.Label>Vertical lines</Switch.Label>
										<Switch.Control class="preset-filled-surface-200-700 data-[state=checked]:preset-filled-primary-500"
											><Switch.Thumb /></Switch.Control
										>
										<Switch.HiddenInput />
									</Switch>
									<hr class="border-surface-200-800 mt-3" />
								</div>
							{:else if colspec && colspec.trim()}
								<!-- spec too exotic to model visually: edit the verbatim string -->
								<div class="settings-row">
									<div class="text-surface-700-300 mb-1.5 text-xs font-semibold">Column spec</div>
									<input
										class="input w-full px-1.5 py-0.5 text-xs"
										value={colspec}
										aria-label="Column spec"
										onchange={(e) => setColspec((e.currentTarget as HTMLInputElement).value)}
									/>
									<div class="text-surface-400 mt-1 text-xs">Too complex to edit visually. Edit the spec directly.</div>
									<hr class="border-surface-200-800 mt-3" />
								</div>
							{/if}
							<div class="settings-row">
								{#if tableNotesEnabled}
									<Switch checked={showNotesInput} onCheckedChange={handleNotesToggle} class="flex items-center justify-between gap-3">
										<Switch.Label>Show notes section</Switch.Label>
										<Switch.Control class="preset-filled-surface-200-700 data-[state=checked]:preset-filled-primary-500">
											<Switch.Thumb />
										</Switch.Control>
										<Switch.HiddenInput />
									</Switch>
								{:else}
									<Tooltip positioning={{ placement: 'top' }} openDelay={200}>
										<Tooltip.Trigger class="w-full">
											<Switch checked={false} disabled class="flex cursor-not-allowed items-center justify-between gap-3 opacity-50">
												<Switch.Label>Show notes section</Switch.Label>
												<Switch.Control class="preset-filled-surface-200-700">
													<Switch.Thumb />
												</Switch.Control>
												<Switch.HiddenInput />
											</Switch>
										</Tooltip.Trigger>
										<Portal>
											<Tooltip.Positioner class="z-floating-ui">
												<Tooltip.Content class="card preset-filled p-2 text-sm">
													This feature is not enabled for this template
												</Tooltip.Content>
											</Tooltip.Positioner>
										</Portal>
									</Tooltip>
								{/if}
							</div>

							{#if columnSpanningEnabled}
								<div class="settings-row">
									<Switch checked={spanningInput} onCheckedChange={handleSpanningToggle} class="flex items-center justify-between gap-3">
										<Switch.Label class="flex items-center gap-2">
											Span columns
											<Tooltip positioning={{ placement: 'top' }} openDelay={200}>
												<Tooltip.Trigger class="inline-flex items-center">
													<Info class="text-surface-500 h-3.5 w-3.5" />
												</Tooltip.Trigger>
												<Portal>
													<Tooltip.Positioner class="z-floating-ui">
														<Tooltip.Content class="card preset-filled p-2 text-sm">
															Table spans across all columns (table* environment)
														</Tooltip.Content>
													</Tooltip.Positioner>
												</Portal>
											</Tooltip>
										</Switch.Label>
										<Switch.Control class="preset-filled-surface-200-700 data-[state=checked]:preset-filled-primary-500">
											<Switch.Thumb />
										</Switch.Control>
										<Switch.HiddenInput />
									</Switch>
								</div>
							{/if}

							<button
								type="button"
								class="text-surface-600-400 hover:text-surface-900-100 my-3 flex w-full items-center gap-2 text-sm transition-colors"
								onclick={() => (showAdvanced = !showAdvanced)}
							>
								<ChevronDown class="h-4 w-4 transition-transform {showAdvanced ? 'rotate-180' : ''}" />
								<span>Advanced options</span>
							</button>

							{#if showAdvanced}
								<div class="border-surface-300-700 mb-3 space-y-4 pl-6">
									<label class="label">
										<span>
											LaTeX Label
											<span class="text-surface-600-400 text-sm">(for \ref commands)</span>
										</span>
										<input
											id="table-label-input"
											type="text"
											class="input text-sm"
											value={labelInput}
											oninput={handleLabelInput}
											onblur={handleLabelBlur}
											placeholder="Custom label (e.g., results-table)"
										/>
										{#if isTexpileManagedLabel(labelInput)}
											<span class="text-surface-500-400 mt-1 flex items-center gap-1 text-xs">
												<Info class="h-3 w-3" />
												Auto-generated unique identifier. You can customize it here.
											</span>
										{/if}
										{#if isDuplicate}
											<p class="text-error-500 mt-1 flex items-center gap-1 text-sm">
												<AlertCircle class="h-4 w-4" />
												This label is already used
											</p>
										{/if}
									</label>

									<!-- per-row rules (\hline, \toprule, ...); empty = no rule before that row -->
									<div class="space-y-1.5">
										<span class="text-surface-900-100 block text-sm font-medium">
											Row rules <span class="text-surface-600-400 text-xs">(e.g. \hline)</span>
										</span>
										{#each rowRules as rule, i (i)}
											<div class="flex items-center gap-2">
												<span class="text-surface-500-400 w-24 shrink-0 text-xs">Before row {i + 1}</span>
												<input
													type="text"
													class="input flex-1 text-xs"
													value={rule}
													placeholder="(none)"
													onchange={(e) => setRowRule(i, (e.currentTarget as HTMLInputElement).value)}
												/>
											</div>
										{/each}
										<div class="flex items-center gap-2">
											<span class="text-surface-500-400 w-24 shrink-0 text-xs">After last row</span>
											<input
												type="text"
												class="input flex-1 text-xs"
												value={bottomRule}
												placeholder="(none)"
												onchange={(e) => setBottomRule((e.currentTarget as HTMLInputElement).value)}
											/>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover>
	</div>
</div>

<style>
	/* flex container makes whitespace between children irrelevant */
	.table-header-container {
		display: flex;
		flex-direction: column;
	}

	:global(.table-wrapper) {
		margin: 1rem 0;
		border: 1px solid var(--color-surface-300);
		border-radius: 0.5rem;
		padding: 1rem;
		background: var(--color-surface-50);
	}

	/* the tableWrapper boundary breaks drag selection (posAtCoords fails there and the selection
	   collapses), so make it transparent to mouse events. wide tables just overflow, no scrollbar. */
	:global(.ProseMirror .tableWrapper) {
		pointer-events: none;
		overflow: visible !important;
		margin: 0 !important;
		padding: 0 !important;
	}

	:global(.ProseMirror .tableWrapper > *) {
		pointer-events: auto;
	}

	/* over-wide tables scroll inside their own box, the page never gets a horizontal scrollbar */
	:global(.table-wrapper-content) {
		max-width: 100%;
		overflow-x: auto;
	}

	.table-caption-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
		background: var(--color-warning-100);
		border: 1px solid var(--color-warning-400);
		border-radius: 0.375rem;
		color: var(--color-warning-700);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.table-caption-warning :global(svg) {
		flex-shrink: 0;
	}

	.table-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-surface-200);
	}

	.table-number-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.table-number {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-surface-900);
	}

	:global(.table-settings-btn) button {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.15s;
		border: none;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.table-settings-btn) button:hover {
		background: var(--color-surface-200);
	}

	.settings-content {
		padding: 0.75rem;
	}

	.settings-row {
		margin-bottom: 0.75rem;
	}

	.settings-row:last-child {
		margin-bottom: 0;
	}

	:global(.table-wrapper-content) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	:global(.table-caption) {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: var(--color-surface-900);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		cursor: text;
		min-height: 1.5rem;
	}

	:global(.table-notes) {
		font-size: 0.75rem;
		margin-top: 0.5rem;
		color: var(--color-surface-600);
		font-style: italic;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		cursor: text;
		min-height: 1.5rem;
	}

	:global(.table-wrapper-content.hide-notes .table-notes) {
		display: none;
	}

	:global(.table-wrapper-content table th) {
		font-weight: 600;
		background: var(--color-surface-100);
	}

	:global(.table-wrapper-content table tr:first-child th) {
		border-bottom: 3px solid var(--color-primary-500);
	}

	:global(.table-wrapper-content table tr th:first-child) {
		border-right: 3px solid var(--color-primary-500);
	}

	/* the surfaces above are hardcoded light, flip them under data-mode=dark */
	:global([data-mode='dark'] .table-wrapper) {
		background: var(--color-surface-950);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark'] .table-caption) {
		color: var(--color-surface-100);
	}
	:global([data-mode='dark'] .table-notes) {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark'] .table-wrapper-content table th) {
		background: var(--color-surface-800);
	}
	:global([data-mode='dark'] .table-settings-btn button:hover) {
		background: var(--color-surface-700);
	}
	:global([data-mode='dark']) .table-header {
		border-bottom-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .table-number {
		color: var(--color-surface-100);
	}
	:global([data-mode='dark']) .table-caption-warning {
		background: var(--color-warning-950);
		border-color: var(--color-warning-700);
		color: var(--color-warning-200);
	}
</style>
