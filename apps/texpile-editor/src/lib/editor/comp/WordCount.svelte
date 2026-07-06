<script lang="ts">
	import { documentCountStore as c } from '$lib/stores/countStore.svelte';

	const fmt = (n: number) => n.toLocaleString();
</script>

<span class="text-surface-500 text-xs whitespace-nowrap tabular-nums select-none">
	{#if c.selectionWords != null}
		{fmt(c.selectionWords)} / {fmt(c.words)} words selected
	{:else}
		{fmt(c.words)} words · {fmt(c.charactersWithSpaces)} characters
	{/if}
</span>
