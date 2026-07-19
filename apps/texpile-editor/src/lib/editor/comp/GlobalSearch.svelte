<script lang="ts">
	import { Search, X, CaseSensitive, Regex, ChevronDown, ChevronRight, FileText } from '@lucide/svelte';
	import { searchInFolder, basename, type SearchFileResult } from '$lib/workspace/fileSystem';
	import { m } from '$lib/paraglide/messages';

	let { root, onOpen, onClose }: { root: string; onOpen: (file: string, line: number) => void; onClose: () => void } = $props();

	let query = $state('');
	let caseSensitive = $state(false);
	let useRegex = $state(false);
	let results = $state<SearchFileResult[]>([]);
	let truncated = $state(false);
	let searching = $state(false);
	let error = $state<string | null>(null);
	let collapsed = $state<Record<string, boolean>>({});
	let timer: ReturnType<typeof setTimeout> | undefined;
	let inputEl = $state<HTMLInputElement | null>(null);

	// the autofocus attribute only fires on mount (and not reliably on dynamic insertion);
	// the Ctrl+Shift+F path calls this so an already-open panel refocuses too. A seed
	// (the editor's selection) replaces the query; select() lets typing replace either way.
	export function focusInput(seed?: string) {
		if (seed?.trim()) query = seed.trim();
		inputEl?.focus();
		inputEl?.select();
	}

	const totalMatches = $derived(results.reduce((n, r) => n + r.matches.length, 0));
	const resultsText = $derived(
		totalMatches === 1
			? m.globalsearch_results_count_one({ count: totalMatches })
			: m.globalsearch_results_count_other({ count: totalMatches })
	);
	const filesText = $derived(
		results.length === 1
			? m.globalsearch_files_count_one({ count: results.length })
			: m.globalsearch_files_count_other({ count: results.length })
	);

	async function runSearch() {
		const q = query.trim();
		if (!q || !root) {
			results = [];
			truncated = false;
			error = null;
			return;
		}
		searching = true;
		const res = await searchInFolder(root, q, { caseSensitive, regex: useRegex });
		results = res.results;
		truncated = res.truncated;
		error = res.error ?? null;
		searching = false;
	}
	// debounced re-search on query/option changes; the void reads register the deps
	$effect(() => {
		void query;
		void caseSensitive;
		void useRegex;
		clearTimeout(timer);
		timer = setTimeout(runSearch, 250);
		return () => clearTimeout(timer);
	});

	// split a result line around the matched substring for highlighting (substring mode only)
	function parts(text: string): { s: string; hit: boolean }[] {
		const q = query.trim();
		if (useRegex || !q) return [{ s: text, hit: false }];
		const hay = caseSensitive ? text : text.toLowerCase();
		const needle = caseSensitive ? q : q.toLowerCase();
		const out: { s: string; hit: boolean }[] = [];
		let i = 0;
		while (i < text.length) {
			const idx = hay.indexOf(needle, i);
			if (idx < 0) {
				out.push({ s: text.slice(i), hit: false });
				break;
			}
			if (idx > i) out.push({ s: text.slice(i, idx), hit: false });
			out.push({ s: text.slice(idx, idx + needle.length), hit: true });
			i = idx + needle.length;
		}
		return out;
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-surface-200-800 flex items-center gap-1 border-b p-2">
		<div class="relative flex-1">
			<Search class="text-surface-400 pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="input h-8 w-full pl-7 text-sm"
				placeholder={m.globalsearch_placeholder()}
				bind:this={inputEl}
				bind:value={query}
				autofocus
				spellcheck="false"
				onkeydown={(e) => e.key === 'Escape' && onClose()}
			/>
		</div>
		<button
			class="btn-icon btn-icon-sm {caseSensitive ? 'preset-tonal-primary' : 'hover:preset-tonal'}"
			title={m.globalsearch_match_case()}
			aria-label={m.globalsearch_match_case()}
			onclick={() => (caseSensitive = !caseSensitive)}><CaseSensitive class="size-4" /></button
		>
		<button
			class="btn-icon btn-icon-sm {useRegex ? 'preset-tonal-primary' : 'hover:preset-tonal'}"
			title={m.globalsearch_use_regex()}
			aria-label={m.globalsearch_use_regex()}
			onclick={() => (useRegex = !useRegex)}><Regex class="size-4" /></button
		>
		<button
			class="btn-icon btn-icon-sm hover:preset-tonal"
			title={m.globalsearch_close_search()}
			aria-label={m.globalsearch_close_search()}
			onclick={onClose}><X class="size-4" /></button
		>
	</div>

	<div class="text-surface-500 px-2 py-1 text-xs">
		{#if searching}
			{m.globalsearch_searching()}
		{:else if error}
			<span class="text-error-500">{error}</span>
		{:else if query.trim()}
			{m.globalsearch_summary({ results: resultsText, files: filesText })}{#if truncated}
				{m.globalsearch_truncated()}{/if}
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto pb-2">
		{#each results as r (r.file)}
			<div>
				<button
					class="hover:preset-tonal-surface flex w-full items-center gap-1 px-2 py-1 text-left text-sm"
					onclick={() => (collapsed[r.file] = !collapsed[r.file])}
				>
					{#if collapsed[r.file]}<ChevronRight class="text-surface-400 size-3.5 shrink-0" />{:else}<ChevronDown
							class="text-surface-400 size-3.5 shrink-0"
						/>{/if}
					<FileText class="text-surface-400 size-3.5 shrink-0" />
					<span class="shrink-0 font-medium">{basename(r.rel)}</span>
					<span class="text-surface-400 truncate text-xs" title={r.rel}>{r.rel}</span>
					<span class="text-surface-400 ml-auto shrink-0 text-xs">{r.matches.length}</span>
				</button>
				{#if !collapsed[r.file]}
					{#each r.matches as match (match.line)}
						<button
							class="hover:preset-tonal-primary flex w-full items-baseline gap-2 py-0.5 pr-2 pl-7 text-left text-xs"
							onclick={() => onOpen(r.file, match.line)}
							title={m.globalsearch_line_title({ line: match.line })}
						>
							<span class="text-surface-400 w-8 shrink-0 text-right tabular-nums">{match.line}</span>
							<span class="truncate font-mono"
								>{#each parts(match.text.trim()) as p}<span class={p.hit ? 'bg-warning-500/40 rounded-sm' : ''}>{p.s}</span>{/each}</span
							>
						</button>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
</div>
