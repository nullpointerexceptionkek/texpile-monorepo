<script lang="ts">
	import { schema } from '$lib/schema/schema';
	import { editorViewStore } from '$lib/stores/editorStore';
	import { DOMSerializer } from 'prosemirror-model';
	import { onMount } from 'svelte';
	import {
		addColumnBefore,
		addColumnAfter,
		deleteColumn,
		addRowBefore,
		addRowAfter,
		deleteRow,
		deleteTable,
		CellSelection,
		mergeCells,
		splitCell
	} from 'prosemirror-tables';
	import { toaster } from '$lib/modals/toaster-svelte';
	import { sliceToLatex, pasteLatexText } from '$lib/editor/extensions/latexClipboard';
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';
	import { Copy, Clipboard, Plus, Trash2, Combine, SplitSquareHorizontal } from '@lucide/svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { m } from '$lib/paraglide/messages';

	let isVisible: boolean = $state(false);
	let isOnTable: boolean = $state(false);
	let selectionType: 'cell' | 'column' | 'row' | null = $state(null);
	let canMerge: boolean = $state(false);
	let canSplit: boolean = $state(false);
	let cursorX: number = $state(0);
	let cursorY: number = $state(0);

	function detectSelectionType(): 'cell' | 'column' | 'row' | null {
		const { state } = $editorViewStore;
		const { selection } = state;

		if (selection instanceof CellSelection) {
			if (selection.isColSelection()) {
				return 'column';
			}
			if (selection.isRowSelection()) {
				return 'row';
			}
			return 'cell';
		}

		return null;
	}

	const menuItems = [
		{
			type: 'item',
			label: m.ctxmenu_copy(),
			icon: Copy,
			shortcut: 'Mod+C',
			action: () => {
				const { state } = $editorViewStore;
				const { from, to } = state.selection;
				if (from === to) {
					return;
				} // nothing to copy
				const slice = state.doc.slice(from, to);
				const fragment = slice.content;

				const serializer = DOMSerializer.fromSchema(schema);

				const div = document.createElement('div');
				div.appendChild(serializer.serializeFragment(fragment));
				const html = div.innerHTML;

				// both flavors: HTML for rich internal paste, LaTeX as the plain-text form so
				// pasting into source mode / another app yields markup, not an empty clipboard
				let latex: string;
				try {
					latex = sliceToLatex(slice);
				} catch {
					latex = state.doc.textBetween(from, to, '\n\n');
				}
				navigator.clipboard
					.write([
						new ClipboardItem({
							'text/html': new Blob([html], { type: 'text/html' }),
							'text/plain': new Blob([latex], { type: 'text/plain' })
						})
					])
					.then(() => {
						toaster.info({ title: m.ctxmenu_copied_toast(), duration: 3000 });
					})
					.catch((_err) => {
						toaster.info({ title: m.ctxmenu_copy_failed_toast(), duration: 3000 });
					});
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_paste(),
			icon: Clipboard,
			shortcut: 'Mod+V',
			action: async () => {
				try {
					const clipboardItems = await navigator.clipboard.read();
					for (const item of clipboardItems) {
						if (item.types.includes('text/html')) {
							const blob = await item.getType('text/html');
							const text = await blob.text();
							$editorViewStore.pasteHTML(text);
						} else if (item.types.includes('text/plain')) {
							const blob = await item.getType('text/plain');
							const text = await blob.text();
							// LaTeX text pastes as rich nodes, same as the Ctrl+V path
							if (!pasteLatexText($editorViewStore, text)) $editorViewStore.pasteText(text);
						} else {
							toaster.warning({
								title: m.ctxmenu_paste_images_hint_toast(),
								duration: 3000
							});
						}
					}
				} catch (_err) {
					toaster.warning({
						title: m.ctxmenu_paste_read_failed_toast(),
						duration: 3000
					});
				}
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_paste_without_formatting(),
			icon: Clipboard,
			shortcut: 'Mod+Shift+V',
			action: async () => {
				try {
					const clipboardItems = await navigator.clipboard.read();
					for (const item of clipboardItems) {
						if (item.types.includes('text/plain')) {
							const blob = await item.getType('text/plain');
							const text = await blob.text();
							$editorViewStore.pasteText(text);
						} else if (item.types.includes('text/html')) {
							const blob = await item.getType('text/html');
							const text = await blob.text();
							const plainText = text.replace(/<[^>]+>/g, '');
							$editorViewStore.pasteText(plainText);
						}
					}
				} catch (_err) {
					toaster.warning({
						title: m.ctxmenu_paste_plain_read_failed_toast(),
						duration: 3000
					});
				}
			}
		}
	];

	const tableMenuItems = [
		{
			type: 'item',
			label: m.ctxmenu_add_column_before(),
			icon: Plus,
			showFor: ['cell', 'column'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				addColumnBefore(state, dispatch);
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_add_column_after(),
			icon: Plus,
			showFor: ['cell', 'column'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				addColumnAfter(state, dispatch);
			}
		},
		{ type: 'separator', showFor: ['cell', 'column'] },
		{
			type: 'item',
			label: m.ctxmenu_add_row_before(),
			icon: Plus,
			showFor: ['cell', 'row'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				addRowBefore(state, dispatch);
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_add_row_after(),
			icon: Plus,
			showFor: ['cell', 'row'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				addRowAfter(state, dispatch);
			}
		},
		{ type: 'separator', showFor: ['cell', 'column', 'row'] },
		{
			type: 'item',
			label: m.ctxmenu_merge_cells(),
			icon: Combine,
			showFor: ['cell'],
			showWhen: () => canMerge,
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				mergeCells(state, dispatch);
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_split_cell(),
			icon: SplitSquareHorizontal,
			showFor: ['cell'],
			showWhen: () => canSplit,
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				splitCell(state, dispatch);
			}
		},
		{ type: 'separator', showFor: ['cell'], showWhen: () => canMerge || canSplit },
		{
			type: 'item',
			label: m.ctxmenu_delete_column(),
			icon: Trash2,
			showFor: ['cell', 'column'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				deleteColumn(state, dispatch);
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_delete_row(),
			icon: Trash2,
			showFor: ['cell', 'row'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				deleteRow(state, dispatch);
			}
		},
		{
			type: 'item',
			label: m.ctxmenu_delete_table(),
			icon: Trash2,
			showFor: ['cell', 'column', 'row'],
			action: () => {
				const view = $editorViewStore;
				const { state, dispatch } = view;
				deleteTable(state, dispatch);
			}
		}
	];

	function getVisibleTableMenuItems() {
		let filtered;
		if (!selectionType) {
			filtered = tableMenuItems.filter((item) => {
				if (item.showWhen && !item.showWhen()) return false;
				return true;
			});
		} else {
			filtered = tableMenuItems.filter((item) => {
				if (item.showWhen && !item.showWhen()) return false;

				if (item.type === 'separator') {
					return item.showFor?.includes(selectionType);
				}
				return item.showFor?.includes(selectionType);
			});
		}

		// drop leading/trailing and consecutive separators
		const result = [];
		for (let i = 0; i < filtered.length; i++) {
			const item = filtered[i];
			const isLast = i === filtered.length - 1;
			const isFirst = i === 0;

			if (item.type === 'separator') {
				if (isFirst || isLast) continue;
				if (result.length > 0 && result[result.length - 1].type === 'separator') continue;
			}
			result.push(item);
		}

		if (result.length > 0 && result[result.length - 1].type === 'separator') {
			result.pop();
		}

		return result;
	}

	function handleContextMenu(event: MouseEvent): void {
		// only override the context menu inside the editor
		if (!(event.target as Element).closest('.texpile-main-editor')) {
			return;
		}

		event.preventDefault();

		const coords = { left: event.clientX, top: event.clientY };
		const pos = $editorViewStore.posAtCoords(coords);

		if (pos) {
			const Resolvedpos = $editorViewStore.state.doc.resolve(pos.pos);
			isOnTable = false;
			for (let i = Resolvedpos.depth; i > 0; i--) {
				if (Resolvedpos.node(i).type.name === 'table') {
					isOnTable = true;
					break;
				}
			}
		}

		if (isOnTable) {
			selectionType = detectSelectionType();
			// calling the commands without dispatch just tests applicability
			const { state } = $editorViewStore;
			canMerge = mergeCells(state);
			canSplit = splitCell(state);
		} else {
			selectionType = null;
			canMerge = false;
			canSplit = false;
		}

		isVisible = true;
		cursorX = event.clientX;
		cursorY = event.clientY;

		// empty transaction keeps the selection visible while the editor is blurred
		requestAnimationFrame(() => {
			if ($editorViewStore && !$editorViewStore.hasFocus()) {
				const { state, dispatch } = $editorViewStore;
				const tr = state.tr;
				dispatch(tr);
			}
		});
	}

	function handleClickOutside(event: MouseEvent): void {
		if (isVisible && !(event.target as Element).closest('.context-menu-popover')) {
			isVisible = false;
		}
	}

	function handleItemClick(action: () => void): void {
		action();
		isVisible = false;
		$editorViewStore.focus();
	}

	onMount(() => {
		document.addEventListener('contextmenu', handleContextMenu);
		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<Popover
	open={isVisible}
	onOpenChange={(e) => (isVisible = e.open)}
	positioning={{
		getAnchorRect: () => ({
			x: cursorX,
			y: cursorY,
			width: 0,
			height: 0
		}),
		placement: 'bottom-start',
		gutter: 2
	}}
	closeOnInteractOutside={true}
	closeOnEscape={true}
	portalled={true}
	autoFocus={false}
>
	<Portal>
		<Popover.Positioner class="z-floating-ui">
			<Popover.Content class="card bg-surface-50-950 context-menu-popover border-surface-300-700 min-w-[240px] border shadow-lg">
				<div class="py-1">
					{#each menuItems as item}
						{#if item.type === 'separator'}
							<div class="my-1 border-t"></div>
						{:else}
							<button
								type="button"
								class="hover:preset-tonal-primary flex w-full items-center gap-3 px-4 py-2 text-left"
								onclick={() => handleItemClick(item.action)}
								onmousedown={(e) => e.preventDefault()}
							>
								<item.icon class="h-4 w-4 flex-shrink-0" />
								<span class="min-w-0 flex-1 text-sm">{item.label}</span>
								{#if item.shortcut}
									<Kbd keys={item.shortcut} />
								{/if}
							</button>
						{/if}
					{/each}

					{#if isOnTable}
						<div class="my-1 border-t"></div>
						{#each getVisibleTableMenuItems() as item}
							{#if item?.type === 'separator'}
								<div class="my-1 border-t"></div>
							{:else}
								<button
									type="button"
									class="hover:preset-tonal-primary flex w-full items-center gap-3 px-4 py-2 text-left"
									onclick={() => handleItemClick(item.action)}
									onmousedown={(e) => e.preventDefault()}
								>
									<item.icon class="h-4 w-4 flex-shrink-0" />
									<span class="min-w-0 flex-1 text-sm">{item.label}</span>
								</button>
							{/if}
						{/each}
					{/if}
				</div>
			</Popover.Content>
		</Popover.Positioner>
	</Portal>
</Popover>

<style>
	/* keep the editor selection visible while the context menu is open */
	:global(.ProseMirror .ProseMirror-selectednode) {
		outline: 2px solid #8cf !important;
	}

	:global(.ProseMirror.ProseMirror-hideselection *::selection),
	:global(.ProseMirror.ProseMirror-hideselection *::-moz-selection) {
		background: transparent !important;
	}

	:global(.ProseMirror *::selection),
	:global(.ProseMirror *::-moz-selection) {
		background: #d3d3d3;
	}

	:global(.ProseMirror-selectednode) {
		outline: 2px solid #8cf;
	}
</style>
