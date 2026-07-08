<script lang="ts">
	import { X, Loader2, TriangleAlert, FolderSearch } from '@lucide/svelte';
	import { pickFolder } from '$lib/workspace/fileSystem';
	import { checkTutorialFolder, type TutorialFolderState } from '$lib/workspace/starters';

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
					<FolderSearch class="text-primary-500 size-5" /> Open the tutorial
				</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label="Close">
					<X class="size-4" />
				</button>
			</div>

			{#if checking}
				<div class="flex items-center gap-2 text-sm">
					<Loader2 class="size-4 animate-spin" /> Checking...
				</div>
			{:else if folderState === 'occupied'}
				<p class="text-surface-600-300 mb-4 flex items-start gap-2 text-sm">
					<TriangleAlert class="text-warning-500 mt-0.5 size-4 shrink-0" />
					<span>
						<code class="bg-surface-200-800 rounded px-1 text-xs break-all">{root}</code> isn't empty. Pick an empty folder for the tutorial project
						instead.
					</span>
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>Cancel</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" /> Choose a folder...
					</button>
				</div>
			{:else if folderState === 'ours'}
				<p class="text-surface-600-300 mb-4 text-sm">
					Reopen your tutorial project at <code class="bg-surface-200-800 rounded px-1 text-xs break-all">{root}</code>?
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>Cancel</button>
					<button class="btn btn-sm hover:preset-tonal gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" /> Choose a different folder...
					</button>
					<button class="btn btn-sm preset-filled-primary-500" onclick={confirm}>Open</button>
				</div>
			{:else if folderState === 'empty'}
				<p class="text-surface-600-300 mb-4 text-sm">
					Create the tutorial project in <code class="bg-surface-200-800 rounded px-1 text-xs break-all">{root}</code>?
				</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>Cancel</button>
					<button class="btn btn-sm hover:preset-tonal gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" /> Choose a different folder...
					</button>
					<button class="btn btn-sm preset-filled-primary-500" onclick={confirm}>Create</button>
				</div>
			{:else}
				<p class="text-surface-600-300 mb-4 text-sm">Pick an empty folder to create the tutorial project in.</p>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>Cancel</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={chooseFolder}>
						<FolderSearch class="size-4" /> Choose a folder...
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
