<script lang="ts">
	import { documentCountStore as c } from '$lib/stores/countStore.svelte';
	import { m } from '$lib/paraglide/messages';

	const fmt = (n: number) => n.toLocaleString();
</script>

<span class="text-surface-500 text-xs whitespace-nowrap tabular-nums select-none">
	{#if c.selectionWords != null}
		{m.wordcount_selected({ selection: fmt(c.selectionWords), total: fmt(c.words) })}
	{:else}
		{m.wordcount_summary({ words: fmt(c.words), characters: fmt(c.charactersWithSpaces) })}
	{/if}
</span>
