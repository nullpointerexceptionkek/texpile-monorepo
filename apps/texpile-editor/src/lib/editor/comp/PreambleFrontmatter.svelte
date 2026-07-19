<!-- editable \title/\author/\date fields for values that live in the preamble (the editor only
  renders the body); edits are redirected straight back into the preamble -->
<script lang="ts">
	import { extractPreambleFrontmatter } from '$lib/editor/extensions/raw-latex/frontmatterView';
	import { m } from '$lib/paraglide/messages';

	let { preamble = '', onEdit }: { preamble?: string; onEdit?: (kind: string, inner: string) => void } = $props();

	const items = $derived(extractPreambleFrontmatter(preamble));
</script>

{#each items as item (item.kind)}
	<div class="frontmatter-block frontmatter-{item.kind}" contenteditable="false">
		{#if item.kind !== 'title'}
			<span class="frontmatter-label">{item.kind}</span>
		{/if}
		<input
			class="frontmatter-input"
			value={item.inner}
			placeholder={item.kind === 'title' ? m.preamble_title_placeholder() : item.kind}
			spellcheck="false"
			aria-label={item.kind}
			oninput={(e) => onEdit?.(item.kind, (e.currentTarget as HTMLInputElement).value)}
		/>
	</div>
{/each}
