<script lang="ts">
	// source control panel, purely presentational: WorkspaceView implements the callbacks
	import { GitBranch, Check, Plus, Minus, Undo2, RefreshCw, GitCommitHorizontal } from '@lucide/svelte';
	import type { GitStatusEntry, GitBadge } from '$lib/workspace/git';
	import { modLabel } from '$lib/platform';

	interface Props {
		root: string;
		isRepo: boolean;
		branch: string | null;
		changes: GitStatusEntry[];
		busy?: boolean;
		onInit: () => void;
		onStage: (paths: string[]) => void;
		onUnstage: (paths: string[]) => void;
		onDiscard: (changes: GitStatusEntry[]) => void;
		onCommit: (message: string) => Promise<boolean>;
		onOpenDiff: (path: string) => void;
		onRefresh: () => void;
	}
	let {
		root,
		isRepo,
		branch,
		changes,
		busy = false,
		onInit,
		onStage,
		onUnstage,
		onDiscard,
		onCommit,
		onOpenDiff,
		onRefresh
	}: Props = $props();

	let commitMessage = $state('');

	// staged = index column set (and not untracked); unstaged = working-dir column dirty
	// (covers modified/deleted and untracked, whose y is '?')
	const isStaged = (c: GitStatusEntry) => c.x !== ' ' && c.x !== '?';
	const isUnstaged = (c: GitStatusEntry) => c.y !== ' ';
	const staged = $derived(changes.filter(isStaged));
	const unstaged = $derived(changes.filter(isUnstaged));

	const LETTER_COLOR: Record<GitBadge, string> = {
		M: 'text-amber-500',
		A: 'text-green-500',
		D: 'text-red-500',
		U: 'text-sky-500',
		R: 'text-violet-500'
	};
	function letter(c: GitStatusEntry, stagedRow: boolean): GitBadge {
		if (c.x === '?') return 'U';
		const ch = stagedRow ? c.x : c.y;
		if (ch === 'A') return 'A';
		if (ch === 'D') return 'D';
		if (ch === 'R') return 'R';
		return 'M';
	}

	const rootN = $derived(root.replace(/\\/g, '/').replace(/\/+$/, ''));
	function relPath(p: string): string {
		const a = p.replace(/\\/g, '/');
		return a.startsWith(rootN + '/') ? a.slice(rootN.length + 1) : a;
	}
	const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
	function dirName(p: string): string {
		const r = relPath(p);
		const i = r.lastIndexOf('/');
		return i >= 0 ? r.slice(0, i) : '';
	}

	async function doCommit() {
		if (await onCommit(commitMessage)) commitMessage = '';
	}
	function commitKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			e.preventDefault();
			doCommit();
		}
	}
</script>

{#snippet fileRow(c: GitStatusEntry, stagedRow: boolean)}
	{@const b = letter(c, stagedRow)}
	<div class="group hover:bg-surface-200-800 flex items-center rounded px-2 py-0.5 text-sm">
		<button class="flex min-w-0 flex-1 items-center gap-1.5 text-left" onclick={() => onOpenDiff(c.path)} title={relPath(c.path)}>
			<span class="truncate">{baseName(c.path)}</span>
			{#if dirName(c.path)}<span class="text-surface-500 truncate text-xs">{dirName(c.path)}</span>{/if}
		</button>
		<div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
			{#if stagedRow}
				<button
					class="hover:preset-tonal rounded p-0.5"
					title="Unstage changes"
					aria-label="Unstage changes"
					onclick={() => onUnstage([c.path])}
				>
					<Minus class="size-3.5" />
				</button>
			{:else}
				<button
					class="hover:preset-tonal-error rounded p-0.5"
					title="Discard changes"
					aria-label="Discard changes"
					onclick={() => onDiscard([c])}
				>
					<Undo2 class="size-3.5" />
				</button>
				<button class="hover:preset-tonal rounded p-0.5" title="Stage changes" aria-label="Stage changes" onclick={() => onStage([c.path])}>
					<Plus class="size-3.5" />
				</button>
			{/if}
		</div>
		<span class="ml-1 w-4 shrink-0 text-center font-mono text-xs font-bold {LETTER_COLOR[b]}" title={b}>{b}</span>
	</div>
{/snippet}

{#if !isRepo}
	<div class="flex flex-col items-center gap-3 p-6 text-center">
		<GitBranch class="text-surface-400 size-8" />
		<p class="text-surface-500 text-sm">This folder is not under source control.</p>
		<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={onInit} disabled={busy}>
			<GitBranch class="size-4" /> Initialize Repository
		</button>
	</div>
{:else}
	<div class="flex h-full min-h-0 flex-col">
		<div class="text-surface-600-300 flex h-7 shrink-0 items-center gap-1.5 px-3 text-xs">
			<GitBranch class="size-3.5 shrink-0" />
			<span class="truncate font-medium">{branch ?? 'no branch'}</span>
			<button
				class="hover:preset-tonal ml-auto shrink-0 rounded p-0.5"
				title="Refresh"
				aria-label="Refresh source control"
				onclick={onRefresh}
			>
				<RefreshCw class="size-3.5" />
			</button>
		</div>

		<div class="border-surface-200-800 space-y-2 border-b px-2 pb-2">
			<textarea
				class="input resize-none text-sm"
				rows="2"
				placeholder={`Message (${modLabel}+Enter to commit)`}
				bind:value={commitMessage}
				onkeydown={commitKeydown}></textarea>
			<button
				class="btn btn-sm preset-filled-primary-500 w-full gap-1.5"
				onclick={doCommit}
				disabled={busy || !commitMessage.trim() || (staged.length === 0 && unstaged.length === 0)}
				title={staged.length ? 'Commit staged changes' : 'Stage all changes and commit'}
			>
				<Check class="size-4" />
				{staged.length ? 'Commit' : 'Commit All'}
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-1.5">
			{#if staged.length}
				<div class="text-surface-500 group/hdr flex items-center gap-1 px-2 py-1 text-xs font-semibold uppercase">
					<span>Staged Changes</span>
					<span class="bg-surface-300-700 rounded-full px-1.5 text-[10px]">{staged.length}</span>
					<button
						class="hover:preset-tonal ml-auto rounded p-0.5 opacity-0 group-hover/hdr:opacity-100"
						title="Unstage all"
						aria-label="Unstage all"
						onclick={() => onUnstage(staged.map((c) => c.path))}
					>
						<Minus class="size-3.5" />
					</button>
				</div>
				{#each staged as c (c.path)}{@render fileRow(c, true)}{/each}
			{/if}

			{#if unstaged.length}
				<div class="text-surface-500 group/hdr flex items-center gap-1 px-2 py-1 text-xs font-semibold uppercase">
					<span>Changes</span>
					<span class="bg-surface-300-700 rounded-full px-1.5 text-[10px]">{unstaged.length}</span>
					<button
						class="hover:preset-tonal-error ml-auto rounded p-0.5 opacity-0 group-hover/hdr:opacity-100"
						title="Discard all changes"
						aria-label="Discard all changes"
						onclick={() => onDiscard(unstaged)}
					>
						<Undo2 class="size-3.5" />
					</button>
					<button
						class="hover:preset-tonal rounded p-0.5 opacity-0 group-hover/hdr:opacity-100"
						title="Stage all changes"
						aria-label="Stage all changes"
						onclick={() => onStage(unstaged.map((c) => c.path))}
					>
						<Plus class="size-3.5" />
					</button>
				</div>
				{#each unstaged as c (c.path)}{@render fileRow(c, false)}{/each}
			{/if}

			{#if !staged.length && !unstaged.length}
				<div class="text-surface-500 mt-8 flex flex-col items-center gap-1 text-center text-sm">
					<GitCommitHorizontal class="size-6 opacity-60" />
					No changes
				</div>
			{/if}
		</div>
	</div>
{/if}
