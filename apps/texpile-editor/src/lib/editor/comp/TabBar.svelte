<script lang="ts">
	// Open-file tabs on a dedicated strip above the editor (Overleaf-style: recessed row, flat
	// tabs, the active one in the editor background so it connects to the content below).
	// Pure chrome; state lives in workspace/tabs.svelte.ts.
	import { X } from '@lucide/svelte';
	import { basename, samePath } from '$lib/workspace/fileSystem';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		tabs: string[];
		activePath: string | null;
		/** only the active file can be dirty (switching files flushes saves). */
		dirty: boolean;
		onActivate: (path: string) => void;
		onClose: (path: string) => void;
	}
	let { tabs, activePath, dirty, onActivate, onClose }: Props = $props();

	const isActive = (t: string) => !!activePath && samePath(t, activePath);
</script>

{#if tabs.length > 0}
	<div
		class="bg-surface-100-900 border-surface-200-800 toolbar-hscroll flex h-9 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b"
		role="tablist"
	>
		{#each tabs as tab (tab)}
			<div
				class="group border-surface-200-800 flex max-w-60 min-w-0 shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-sm {isActive(
					tab
				)
					? 'bg-surface-50-950'
					: 'text-surface-600-400 hover:bg-surface-200-800/60'}"
				role="tab"
				aria-selected={isActive(tab)}
				tabindex="0"
				title={tab}
				onclick={() => onActivate(tab)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onActivate(tab);
					}
				}}
				onauxclick={(e) => {
					if (e.button === 1) onClose(tab);
				}}
			>
				<span class="truncate leading-none">{basename(tab)}</span>
				<!-- fixed-size trailing slot: dirty dot and close button share it, so neither ever
				     changes the tab's width; hovering swaps the dot for the close button -->
				<span class="-mr-1 flex size-5 shrink-0 items-center justify-center">
					{#if isActive(tab) && dirty}
						<span class="bg-warning-500 size-2 rounded-full group-hover:hidden" title={m.wsview_unsaved_changes()}></span>
					{/if}
					<button
						class="hover:bg-surface-300-700 items-center justify-center rounded p-0.5 {isActive(tab) && dirty
							? 'hidden group-hover:inline-flex'
							: isActive(tab)
								? 'inline-flex'
								: 'inline-flex opacity-0 group-hover:opacity-100'}"
						onclick={(e) => {
							e.stopPropagation();
							onClose(tab);
						}}
						aria-label={m.tabs_close()}
						title={m.tabs_close()}
					>
						<X class="size-3.5" />
					</button>
				</span>
			</div>
		{/each}
	</div>
{/if}
