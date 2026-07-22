<script lang="ts">
	import { X, Loader2, TriangleAlert, FolderSearch } from '@lucide/svelte';
	import { pickFolder } from '$lib/workspace/fileSystem';
	import { checkTutorialFolder, type TutorialFolderState } from '$lib/workspace/starters';
	import { m } from '$lib/paraglide/messages';

	let {
		open = $bindable(false),
		onConfirm
	}: {
		open: boolean;
		onConfirm: (root: string) => void;
	} = $props();

	let folderState = $state<TutorialFolderState | null>(null);
	let root = $state<string | null>(null);
	let checking = $state(false);

	$effect(() => {
		if (!open) {
			folderState = null;
			root = null;
		}
	});

	async function chooseFolder() {
		const picked = await pickFolder();
		if (!picked) return;
		checking = true;
		const r = await checkTutorialFolder(picked);
		root = r.root;
		folderState = r.state;
		checking = false;
	}

	function close() {
		open = false;
	}
	function confirm() {
		if (!root) return;
		close();
		onConfirm(root);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && close()}
	>
		<div class="card bg-surface-50-950 border-surface-300-700 w-full max-w-md border p-5 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-base font-semibold">
					<FolderSearch class="text-primary-500 size-5" />
					{m.tutorial_confirm_title()}
				</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label={m.tutorial_close_aria()}>
					<X class="size-4" />
				</button>
			</div>

			{#if checking}
				<div class="flex items-center gap-2 text-sm">
					<Loader2 class="size-4 animate-spin" />
					{m.tutorial_checking()}
				</div>
			{:else if folderState === 'occupied'}
				<p class="text-surface-600-300 mb-4 flex items-start gap-2 text-sm">
					<TriangleAlert class="text-warning-500 mt-0.5 size-4 shrink-0" />
					<span>
						{m.tutorial_occupied_desc({ root: root ?? '' })}
					</span>
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.tutorial_cancel()}</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" />
						{m.tutorial_choose_folder()}
					</button>
				</div>
			{:else if folderState === 'ours'}
				<p class="text-surface-600-300 mb-4 text-sm">
					{m.tutorial_reopen_desc({ root: root ?? '' })}
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.tutorial_cancel()}</button>
					<button class="btn btn-sm hover:preset-tonal gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" />
						{m.tutorial_choose_different_folder()}
					</button>
					<button class="btn btn-sm preset-filled-primary-500" onclick={confirm}>{m.tutorial_open()}</button>
				</div>
			{:else if folderState === 'empty'}
				<p class="text-surface-600-300 mb-4 text-sm">
					{m.tutorial_create_desc({ root: root ?? '' })}
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.tutorial_cancel()}</button>
					<button class="btn btn-sm hover:preset-tonal gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" />
						{m.tutorial_choose_different_folder()}
					</button>
					<button class="btn btn-sm preset-filled-primary-500" onclick={confirm}>{m.tutorial_create()}</button>
				</div>
			{:else}
				<p class="text-surface-600-300 mb-4 text-sm">{m.tutorial_pick_empty_desc()}</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.tutorial_cancel()}</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" />
						{m.tutorial_choose_folder()}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
