<script lang="ts">
	import { tocStore } from '$lib/editor/extensions/tableofcontents/tocStore';
	import { editorViewStore } from '$lib/stores/editorStore';
	import { TextSelection } from 'prosemirror-state';

	function goTo(pos: number) {
		const view = $editorViewStore;
		if (!view) return;
		const sel = TextSelection.near(view.state.doc.resolve(Math.min(pos + 1, view.state.doc.content.size)));
		view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
		view.focus();
	}
</script>

<nav class="text-sm">
	<div class="text-surface-400 mb-2 text-xs font-semibold tracking-wide uppercase">Contents</div>
	{#if $tocStore.length === 0}
		<p class="text-surface-400 text-xs">No headings yet.</p>
	{:else}
		<div class="flex flex-col gap-0.5">
			{#each $tocStore as item, i (i)}
				<button
					type="button"
					class="text-surface-600-300 hover:text-primary-600 block w-full max-w-full truncate rounded-base px-1 py-0.5 text-left transition-colors"
					style="padding-left: {(Math.max(1, item.level) - 1) * 0.7 + 0.25}rem"
					title={item.text}
					onclick={() => goTo(item.pos)}
				>
					{(item.text || 'Untitled').slice(0, 80)}
				</button>
			{/each}
		</div>
	{/if}
</nav>
