<script lang="ts">
	import type { Node as PMNode } from 'prosemirror-model';
	import { referenceStore, templateFeaturesStore } from '$lib/stores/editorStore';
	import { ChevronDown } from '@lucide/svelte';

	let {
		node,
		onUpdate,
		onChangeKey,
		dropdownOpen = $bindable()
	}: {
		node: PMNode;
		onUpdate: (attrs: Record<string, unknown>) => void;
		onChangeKey?: (key: string) => void;
		dropdownOpen: boolean;
	} = $props();

	const key = $derived(node.textContent);
	const reference = $derived($referenceStore?.find((ref) => ref.key === key));

	// dropdown label, capped so long titles don't blow out the select
	function refLabel(ref: { author?: string | string[]; year?: string; title?: string; key?: string }): string {
		const author = Array.isArray(ref.author) ? ref.author.join(', ') : ref.author;
		let s = author || ref.key || '';
		if (ref.year) s += ` (${ref.year})`;
		if (ref.title) s += ` — ${ref.title}`;
		return s.length > 70 ? s.slice(0, 69).trimEnd() + '…' : s;
	}

	// seeded from the node once by design: the form pushes changes back via the auto-save $effect
	// svelte-ignore state_referenced_locally
	const initialAttrs = node.attrs;
	let postnote = $state(initialAttrs.postnote || '');
	let prenote = $state(initialAttrs.prenote || '');
	let variant = $state(initialAttrs.variant || 'autocite');

	let showAdvanced = $state(false);

	let prevValues = $state({
		postnote: initialAttrs.postnote || '',
		prenote: initialAttrs.prenote || '',
		variant: initialAttrs.variant || 'autocite'
	});

	let hasMounted = $state(false);

	const defaultVariantOptions = [
		{ value: 'autocite', label: 'Automatic', desc: 'Let the document style decide' },
		{ value: 'parencite', label: 'Parenthetical', desc: '(Author Year)' },
		{ value: 'textcite', label: 'In-text', desc: 'Author (Year)' },
		{ value: 'cite', label: 'Basic', desc: 'Simple citation' }
	];

	const variantOptions = $derived(
		$templateFeaturesStore?.citationVariants?.length ? $templateFeaturesStore.citationVariants : defaultVariantOptions
	);

	const showCitationStyleSelector = $derived(variantOptions.length > 1);

	// auto-save on change
	$effect(() => {
		// skip the initial run so mount doesn't trigger a save
		if (!hasMounted) {
			hasMounted = true;
			return;
		}

		const hasChanges = postnote !== prevValues.postnote || prenote !== prevValues.prenote || variant !== prevValues.variant;

		if (hasChanges) {
			onUpdate({ prenote, postnote, variant });
			prevValues = { postnote, prenote, variant };
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			dropdownOpen = false;
		}
	}
</script>

<div class="citation-edit-form" role="dialog" aria-label="Edit citation options" tabindex="-1" onkeydown={handleKeydown}>
	<div class="border-surface-300-700 mb-4 border-b pb-3">
		{#if onChangeKey && $referenceStore?.length}
			<span class="text-surface-900-100 text-sm font-medium">Reference</span>
			<select class="input mt-1.5 w-full text-sm" value={key} onchange={(e) => onChangeKey?.((e.currentTarget as HTMLSelectElement).value)}>
				{#if !reference}<option value={key}>{key} (not found)</option>{/if}
				{#each $referenceStore as ref}
					<option value={ref.key} title={ref.title || ref.key}>{refLabel(ref)}</option>
				{/each}
			</select>
		{:else}
			<div class="text-surface-900-100 text-base font-semibold">{reference?.author || 'Unknown Author'}</div>
			<div class="text-surface-600-400 text-sm">
				{reference?.year || 'N/A'}
				{#if reference?.title}<span class="mt-1 block text-xs italic">{reference.title}</span>{/if}
			</div>
		{/if}
	</div>

	<label class="mb-4 block">
		<span class="text-surface-900-100 text-sm font-medium">Page numbers</span>
		<span class="text-surface-500-400 ml-1 text-xs">(optional)</span>
		<input type="text" bind:value={postnote} placeholder="e.g., 23-45, ch. 2" class="input mt-1.5 w-full" />
		<span class="text-surface-500-400 mt-1 block text-xs"> Add page numbers or chapter references </span>
	</label>

	<button
		type="button"
		class="text-surface-600-400 hover:text-surface-900-100 mb-3 flex w-full items-center gap-2 text-sm transition-colors"
		onclick={() => (showAdvanced = !showAdvanced)}
	>
		<ChevronDown class="h-4 w-4 transition-transform {showAdvanced ? 'rotate-180' : ''}" />
		<span>Advanced options</span>
	</button>

	{#if showAdvanced}
		<div class="border-surface-300-700 mb-3 space-y-4 pl-6">
			{#if showCitationStyleSelector}
				<label class="block">
					<span class="text-surface-900-100 text-sm font-medium">Citation style</span>
					<select bind:value={variant} class="input mt-1.5 w-full text-sm">
						{#each variantOptions as opt}
							<option value={opt.value}>
								{opt.label} — {opt.desc}
							</option>
						{/each}
					</select>
				</label>
			{/if}

			<div>
				<span class="text-surface-900-100 mb-1.5 block text-sm font-medium">Add prefix</span>
				<div class="mb-2 flex flex-wrap gap-2">
					<button type="button" class="btn btn-sm preset-outlined-primary-500" onclick={() => (prenote = 'see')}> see </button>
					<button type="button" class="btn btn-sm preset-outlined-primary-500" onclick={() => (prenote = 'cf.')}> cf. </button>
					<button type="button" class="btn btn-sm preset-outlined-primary-500" onclick={() => (prenote = 'compare')}> compare </button>
				</div>
				<input type="text" bind:value={prenote} placeholder="Custom prefix text" class="input w-full text-sm" />
				<span class="text-surface-500-400 mt-1 block text-xs"> Text to appear before the citation </span>
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	.citation-edit-form {
		font-family: inherit;
	}
</style>
