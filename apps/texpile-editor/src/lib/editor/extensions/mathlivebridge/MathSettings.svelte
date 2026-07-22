<script lang="ts">
	// MathSettings popover for equation numbering, labels, and multi-line environments
	import { Popover, Tooltip, Switch, Portal } from '@skeletonlabs/skeleton-svelte';
	import { Settings, ChevronDown, Info, Trash2 } from '@lucide/svelte';
	import type { EditorView } from 'prosemirror-view';
	import type { Node as PMNode } from 'prosemirror-model';
	import { generateLabel, isTexpileLabel, sanitizeLabel } from '$lib/editor/utils/label';
	import { isReadOnly } from '$lib/stores/permissionStore';
	import { toggleEnvironmentStar } from './mlview.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		node: PMNode;
		view: EditorView;
		getPos: () => number | undefined;
	}

	let { node, view, getPos }: Props = $props();

	let settingsOpen = $state(false);
	let showAdvanced = $state(false);
	// form fields are seeded from the node once, by design
	// svelte-ignore state_referenced_locally
	const initialAttrs = node.attrs;
	let labelInput = $state(initialAttrs.label || '');
	let numberedInput = $state(initialAttrs.numbered || false);
	let environmentInput = $state<string>(initialAttrs.environment || '');
	let lineLabelsInput = $state<string[]>((initialAttrs.lineLabels as string[]) || []);

	let originalTexpileLabel = $derived(node.attrs.label || '');

	let mathContent = $derived(node.content?.firstChild?.text || '');

	let detectedLineCount = $derived(() => {
		if (!mathContent) return 1;
		const matches = mathContent.match(/\\\\/g);
		return matches ? matches.length + 1 : 1;
	});

	// re-sync when the node changes externally
	$effect(() => {
		labelInput = node.attrs.label || '';
		numberedInput = node.attrs.numbered || false;
		environmentInput = node.attrs.environment || '';
		lineLabelsInput = (node.attrs.lineLabels as string[]) || [];
	});

	// multline only has one label, so it uses the single-label UI
	let isPerLineLabelMode = $derived(environmentInput !== '' && ['align', 'gather', 'alignat', 'eqnarray'].includes(environmentInput));

	let hasSpecialEnvironment = $derived(
		environmentInput !== '' && ['align', 'gather', 'alignat', 'eqnarray', 'multline'].includes(environmentInput)
	);

	function isTexpileManagedLabel(label: string | null): boolean {
		return isTexpileLabel(label);
	}

	function isLabelDuplicate(label: string): boolean {
		if (!label) return false;
		const pos = getPos();
		if (pos === undefined) return false;

		let isDuplicate = false;
		view.state.doc.descendants((n, nodePos) => {
			if (nodePos !== pos && n.type.name === 'block_math' && n.attrs.label === label) {
				isDuplicate = true;
				return false;
			}
		});
		return isDuplicate;
	}

	let isDuplicate = $derived(labelInput && !isTexpileManagedLabel(labelInput) && isLabelDuplicate(labelInput));

	function updateAttrs(attrs: Partial<typeof node.attrs>) {
		const pos = getPos();
		if (pos !== undefined) {
			const tr = view.state.tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				...attrs
			});
			view.dispatch(tr);
		}
	}

	function handleNumberedToggle(details: { checked: boolean }) {
		const newNumbered = details.checked;
		numberedInput = newNumbered;

		if (hasSpecialEnvironment) {
			const pos = getPos();
			if (pos !== undefined) {
				// the node prop can be stale, read from the live doc
				const currentNode = view.state.doc.nodeAt(pos);
				if (!currentNode) return;
				const currentContent = currentNode.textContent || '';

				// star = unnumbered, so invert
				const newContent = toggleEnvironmentStar(currentContent, !newNumbered);

				if (newContent !== currentContent) {
					const tr = view.state.tr;
					const startPos = pos;
					const endPos = pos + currentNode.nodeSize;
					const nodeType = currentNode.type;
					const newAttrs: Record<string, unknown> = { ...currentNode.attrs, numbered: newNumbered };
					if (newNumbered && !isPerLineLabelMode && !currentNode.attrs.label) {
						const newLabel = generateLabel('equation');
						newAttrs.label = newLabel;
						labelInput = newLabel;
					}
					const textNode = view.state.schema.text(newContent);
					tr.replaceWith(startPos, endPos, nodeType.create(newAttrs, textNode));
					view.dispatch(tr);
					return;
				}
			}
			updateAttrs({ numbered: newNumbered });
		} else if (newNumbered && !labelInput) {
			const newLabel = generateLabel('equation');
			labelInput = newLabel;
			updateAttrs({ numbered: newNumbered, label: newLabel });
		} else {
			updateAttrs({ numbered: newNumbered });
		}
	}

	function handleLineLabelChange(index: number, value: string) {
		const sanitized = sanitizeLabel(value);
		const newLabels = [...lineLabelsInput];
		newLabels[index] = sanitized;
		lineLabelsInput = newLabels;
		updateAttrs({ lineLabels: newLabels });
	}

	function generateLineLabel(index: number) {
		const newLabel = generateLabel('equation');
		const newLabels = [...lineLabelsInput];
		newLabels[index] = newLabel;
		lineLabelsInput = newLabels;
		updateAttrs({ lineLabels: newLabels });
	}

	function clearLineLabel(index: number) {
		const newLabels = [...lineLabelsInput];
		newLabels[index] = '';
		lineLabelsInput = newLabels;
		updateAttrs({ lineLabels: newLabels });
	}

	function handleLabelInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		const sanitized = sanitizeLabel(value);

		if (value !== sanitized) {
			target.value = sanitized;
		}
	}
	function handleLabelBlur() {
		const currentLabel = labelInput.trim().replace(/[^a-zA-Z0-9-_]/g, '');

		if (!currentLabel || isLabelDuplicate(currentLabel)) {
			labelInput = originalTexpileLabel;
			updateAttrs({ label: originalTexpileLabel });
			return;
		}

		if (currentLabel !== node.attrs.label) {
			updateAttrs({ label: currentLabel });
		}
	}
</script>

<div class="math-settings-container">
	<Popover
		open={settingsOpen}
		onOpenChange={(details) => (settingsOpen = details.open)}
		positioning={{ placement: 'bottom-end', offset: { mainAxis: 4 } }}
	>
		<Popover.Trigger class="math-settings-btn">
			<button
				type="button"
				title={m.mathsettings_settings_button_label()}
				aria-label={m.mathsettings_settings_button_label()}
				disabled={$isReadOnly}
			>
				<Settings class="h-4 w-4" />
			</button>
		</Popover.Trigger>

		<Portal>
			<Popover.Positioner class="z-floating-ui">
				<Popover.Content class="card bg-surface-50-950 border-surface-300-700 w-[280px] border shadow-lg">
					<div class="settings-content">
						<div class="settings-row">
							<Switch checked={numberedInput} onCheckedChange={handleNumberedToggle} class="flex w-full items-center justify-between gap-3">
								<Switch.Label class="flex items-center gap-2">
									<span>{m.mathsettings_numbered_label()}</span>
									<Tooltip positioning={{ placement: 'top' }} openDelay={200}>
										<Tooltip.Trigger class="inline-flex items-center">
											<Info class="text-surface-500 h-3.5 w-3.5" />
										</Tooltip.Trigger>
										<Portal>
											<Tooltip.Positioner class="z-floating-ui">
												<Tooltip.Content class="card preset-filled p-2 text-sm">{m.mathsettings_numbered_tooltip()}</Tooltip.Content>
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

						{#if numberedInput}
							{#if hasSpecialEnvironment}
								<div class="settings-row">
									<div class="flex items-center gap-2">
										<span class="text-surface-600-400 text-sm">{m.mathsettings_environment_label()}</span>
										<span class="preset-tonal-primary rounded px-2 py-0.5 text-sm font-medium capitalize">{environmentInput}</span>
										<Tooltip positioning={{ placement: 'top' }} openDelay={200}>
											<Tooltip.Trigger class="inline-flex items-center">
												<Info class="text-surface-500 h-3.5 w-3.5" />
											</Tooltip.Trigger>
											<Portal>
												<Tooltip.Positioner class="z-floating-ui">
													<Tooltip.Content class="card preset-filled max-w-[220px] p-2 text-sm">
														{#if isPerLineLabelMode}
															{m.mathsettings_environment_tooltip_perline()}
														{:else}
															{m.mathsettings_environment_tooltip_single()}
														{/if}
													</Tooltip.Content>
												</Tooltip.Positioner>
											</Portal>
										</Tooltip>
									</div>
								</div>
							{/if}

							{#if isPerLineLabelMode}
								<div class="border-surface-300-700 mt-3 border-t pt-3">
									<span class="text-surface-700-300 mb-2 block text-sm font-medium">{m.mathsettings_line_labels_heading()}</span>
									<p class="text-surface-500 mb-2 text-xs">
										{m.mathsettings_line_labels_hint({ refSyntax: '\\ref{label}' })}
									</p>
									{#each { length: detectedLineCount() } as _, i}
										<div class="mb-2 flex items-center gap-2">
											<span class="text-surface-500 w-12 text-xs">{m.mathsettings_line_number_label({ number: i + 1 })}</span>
											<input
												type="text"
												class="input flex-1 text-sm"
												value={lineLabelsInput[i] || ''}
												oninput={(e) => handleLineLabelChange(i, (e.target as HTMLInputElement).value)}
												placeholder={m.mathsettings_line_label_placeholder({ index: i + 1 })}
											/>
											{#if lineLabelsInput[i]}
												<button
													type="button"
													class="preset-tonal-surface hover:preset-tonal-error btn-icon btn-icon-sm"
													onclick={() => clearLineLabel(i)}
													title={m.mathsettings_clear_label_title()}
												>
													<Trash2 class="h-3 w-3" />
												</button>
											{:else}
												<button type="button" class="btn btn-sm preset-tonal" onclick={() => generateLineLabel(i)}>
													{m.mathsettings_auto_button()}
												</button>
											{/if}
										</div>
									{/each}
									{#if detectedLineCount() === 1}
										<p class="text-surface-500 mt-2 text-xs italic">{m.mathsettings_multiline_tip()}</p>
									{/if}
								</div>
							{/if}

							{#if !isPerLineLabelMode}
								<button
									type="button"
									class="text-surface-600-400 hover:text-surface-900-100 my-3 flex w-full items-center gap-2 text-sm transition-colors"
									onclick={() => (showAdvanced = !showAdvanced)}
								>
									<ChevronDown class="h-4 w-4 transition-transform {showAdvanced ? 'rotate-180' : ''}" />
									<span>{m.mathsettings_advanced_options()}</span>
								</button>

								{#if showAdvanced}
									<div class="border-surface-300-700 mb-3 space-y-4 pl-6">
										<label class="label">
											<span>
												{m.mathsettings_label_field_label()}
												<span class="text-surface-600-400 text-sm">{m.mathsettings_label_field_hint()}</span>
											</span>
											<input
												type="text"
												class="input text-sm"
												class:input-error={isDuplicate}
												value={labelInput}
												oninput={handleLabelInput}
												onblur={handleLabelBlur}
												placeholder={m.mathsettings_label_placeholder()}
											/>
											{#if isDuplicate}
												<p class="text-error-600 mt-1 text-xs">{m.mathsettings_label_duplicate_error()}</p>
											{/if}
											<p class="text-surface-500 mt-1 text-xs">{m.mathsettings_label_field_note()}</p>
										</label>
									</div>
								{/if}
							{/if}
						{/if}
					</div>
				</Popover.Content>
			</Popover.Positioner>
		</Portal>
	</Popover>
</div>

<style>
	.math-settings-container {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		z-index: 10;
		display: flex;
		align-items: center;
		pointer-events: auto;
	}

	/* when numbered, push further left to avoid the equation number */
	:global(.block-math-container[data-numbered='true']) .math-settings-container {
		right: 4rem;
	}

	/* match table wrapper styling */
	:global(.math-settings-btn) button {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.15s;
		border: none;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		opacity: 0;
	}

	:global(.block-math-container:hover .math-settings-btn) button,
	:global(.math-settings-btn) button:focus-visible {
		opacity: 1;
	}

	:global(.math-settings-btn) button:hover {
		background: var(--color-surface-200);
	}

	/* match table dropdown styling */
	.settings-content {
		padding: 0.75rem;
	}

	.settings-row {
		margin-bottom: 0.75rem;
	}

	.settings-row:last-child {
		margin-bottom: 0;
	}
</style>
