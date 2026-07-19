<script lang="ts">
	import { STARTERS, type Starter, type ImportedFile } from '$lib/workspace/starters';
	import { FileText, FilePlus, FolderInput } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		onPick,
		onBlank,
		onImport,
		busy = false
	}: {
		onPick: (s: Starter) => void;
		onBlank?: () => void;
		/** "Import your own" card: existing text files the user picked, to seed the folder with. */
		onImport?: (files: ImportedFile[]) => void;
		busy?: boolean;
	} = $props();

	let importInput = $state<HTMLInputElement>();
	async function onFilesPicked(e: Event) {
		const input = e.target as HTMLInputElement;
		const picked = [...(input.files ?? [])];
		input.value = '';
		if (!picked.length) return;
		// text formats only; read in place, nothing is uploaded
		const files = await Promise.all(picked.map(async (f) => ({ name: f.name, content: await f.text() })));
		onImport?.(files);
	}
</script>

<div class="w-full">
	<div class="grid gap-2 sm:grid-cols-2">
		{#each STARTERS as s (s.id)}
			<button
				class="border-surface-200-800 hover:border-primary-500 hover:bg-surface-100-900 rounded-container flex flex-col gap-1 border p-3 text-left transition-colors disabled:opacity-50"
				disabled={busy}
				onclick={() => onPick(s)}
			>
				<span class="flex items-center gap-2 font-medium"><FileText class="text-primary-500 size-4 shrink-0" /> {s.name}</span>
				<span class="text-surface-500 text-xs">{s.description}</span>
			</button>
		{/each}
		{#if onImport}
			<button
				class="border-surface-200-800 hover:border-primary-500 hover:bg-surface-100-900 rounded-container flex flex-col gap-1 border p-3 text-left transition-colors disabled:opacity-50 sm:col-span-2"
				disabled={busy}
				onclick={() => importInput?.click()}
			>
				<span class="flex items-center gap-2 font-medium"
					><FolderInput class="text-primary-500 size-4 shrink-0" /> {m.starter_import_own()}</span
				>
				<span class="text-surface-500 text-xs">{m.starter_import_description()}</span>
			</button>
			<input bind:this={importInput} type="file" multiple accept=".tex,.bib,.cls,.sty,.bst" class="hidden" onchange={onFilesPicked} />
		{/if}
	</div>
	{#if onBlank}
		<button
			class="text-surface-500 hover:text-surface-950-50 mt-3 inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
			disabled={busy}
			onclick={onBlank}
		>
			<FilePlus class="size-4" />
			{m.starter_blank_file()}
		</button>
	{/if}
</div>
