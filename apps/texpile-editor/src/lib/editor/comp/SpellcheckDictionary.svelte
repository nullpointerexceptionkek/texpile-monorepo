<!-- custom dictionary editor; the linter helpers keep Harper's in-memory dictionary in sync -->
<script lang="ts">
	import { X } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import { editorConfigStore } from '$lib/stores/editorStore';
	import { addWordToDocumentDictionary, removeWordFromDocumentDictionary } from '$lib/editor/extensions/harper';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let newWord = $state('');
	const words = $derived([...($editorConfigStore?.dictionary ?? [])].sort((a, b) => a.localeCompare(b)));

	async function add() {
		const w = newWord.trim();
		if (!w) return;
		newWord = '';
		await addWordToDocumentDictionary(w);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && (open = false)}
	>
		<div class="card bg-surface-50-950 border-surface-300-700 flex max-h-[80vh] w-full max-w-md flex-col border p-4 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold">{m.spelldict_heading()}</h2>
				<button
					class="btn-icon btn-icon-sm hover:preset-tonal"
					type="button"
					aria-label={m.spelldict_close_label()}
					onclick={() => (open = false)}
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="mb-3 flex gap-2">
				<input
					bind:value={newWord}
					class="input flex-1"
					placeholder={m.spelldict_add_word_placeholder()}
					spellcheck="false"
					onkeydown={(e) => {
						if (e.key === 'Enter') add();
					}}
				/>
				<button class="btn btn-sm preset-filled-primary-500" type="button" onclick={add} disabled={!newWord.trim()}
					>{m.spelldict_add_button()}</button
				>
			</div>

			<ul class="min-h-0 flex-1 overflow-y-auto">
				{#each words as word (word)}
					<li class="border-surface-200-800 flex items-center justify-between border-b py-1.5 text-sm last:border-b-0">
						<span class="truncate">{word}</span>
						<button
							class="btn-icon btn-icon-sm hover:preset-tonal opacity-60 hover:opacity-100"
							type="button"
							aria-label={m.spelldict_remove_word_label({ word })}
							onclick={() => removeWordFromDocumentDictionary(word)}
						>
							<X class="size-4" />
						</button>
					</li>
				{:else}
					<li class="text-surface-500 py-4 text-center text-sm">{m.spelldict_empty_state()}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
