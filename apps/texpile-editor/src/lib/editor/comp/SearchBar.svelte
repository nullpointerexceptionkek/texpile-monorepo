<!-- floating Ctrl+F search bar for the ProseMirror editor, toggled by displaySearchBarStore -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { displaySearchBarStore as display, editorViewStore } from '$lib/stores/editorStore';
	import { setSearchState, SearchQuery, findNext, findPrev } from 'prosemirror-search';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import X from '@lucide/svelte/icons/x';

	let searchTerm = $state('');
	let searchInput = $state<HTMLInputElement>();
	let match = $state(0);
	let current = $state(0);

	function runSearch(reset = false) {
		const view = $editorViewStore;
		if (!view?.state) return;
		if (reset) current = 0;
		const query = new SearchQuery({ search: searchTerm });

		let m = 0;
		for (let from = 0, res; (res = query.findNext(view.state, from)); from = res.to) m++;
		match = m;

		view.dispatch(setSearchState(view.state.tr, query));

		if (!reset) {
			findNext(view.state, view.dispatch);
			incrementCurrent();
			scrollToSelection();
		}
	}

	const incrementCurrent = () => {
		if (match === 0) return;
		current = (current % match) + 1;
	};
	const decrementCurrent = () => {
		if (match === 0) return;
		current = current - 1 || match;
	};

	function gotoPrev() {
		if (!$editorViewStore?.state) return;
		findPrev($editorViewStore.state, $editorViewStore.dispatch);
		decrementCurrent();
		scrollToSelection();
	}
	function gotoNext() {
		if (!$editorViewStore?.state) return;
		findNext($editorViewStore.state, $editorViewStore.dispatch);
		incrementCurrent();
		scrollToSelection();
	}

	function scrollToSelection() {
		const view = $editorViewStore;
		if (!view?.state) return;
		const { from } = view.state.selection;
		const coords = view.coordsAtPos(from);
		const scrollContainer = view.dom.closest('.overflow-y-auto') as HTMLElement | null;
		if (scrollContainer && coords) {
			const containerRect = scrollContainer.getBoundingClientRect();
			const relativeTop = coords.top - containerRect.top + scrollContainer.scrollTop;
			scrollContainer.scrollTo({ top: relativeTop - containerRect.height / 2, behavior: 'smooth' });
		}
	}

	function closeBar() {
		$display = false;
		const view = $editorViewStore;
		if (view?.state) view.dispatch(setSearchState(view.state.tr, new SearchQuery({ search: '' })));
	}

	function handleKeydown(e: KeyboardEvent) {
		// ignore Ctrl/Cmd+Shift+F, that's Find in Files (handled elsewhere)
		if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
			e.preventDefault();
			if ($display) closeBar();
			else $display = true;
			setTimeout(() => searchInput?.focus(), 0);
		}
		if (e.key === 'Escape' && $display) closeBar();
	}

	// focus the input whenever the bar becomes visible
	$effect(() => {
		if ($display) setTimeout(() => searchInput?.focus(), 0);
	});

	onMount(() => window.addEventListener('keydown', handleKeydown));
	onDestroy(() => window.removeEventListener('keydown', handleKeydown));
</script>

{#if $display}
	<!-- anchored to the editor pane's top-right (the WorkspaceView wrapper is relative), matching the source editor's search panel -->
	<div
		transition:slide={{ duration: 180 }}
		class="card preset-outlined-surface-200-800 bg-surface-50-950 absolute top-2 right-3 z-20 flex items-center gap-2 p-2 shadow-xl"
	>
		<input
			type="text"
			bind:this={searchInput}
			bind:value={searchTerm}
			oninput={() => runSearch(true)}
			onkeydown={(e) => e.key === 'Enter' && runSearch()}
			placeholder="Search…"
			class="input w-56"
		/>
		<span class="badge preset-filled-surface-200-800 min-w-[3.5rem] text-center">{match ? `${current}/${match}` : '0/0'}</span>
		<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={gotoPrev} aria-label="Previous match"
			><ArrowLeft class="size-4" /></button
		>
		<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={gotoNext} aria-label="Next match"><ArrowRight class="size-4" /></button
		>
		<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={closeBar} aria-label="Close search"><X class="size-4" /></button>
	</div>
{/if}

<style lang="postcss">
	:global(.ProseMirror .ProseMirror-search-match) {
		background-color: rgb(255, 237, 153) !important;
		border-bottom: 2px solid rgb(255, 213, 79) !important;
	}
	:global(.ProseMirror .ProseMirror-active-search-match) {
		background-color: rgb(255, 213, 79) !important;
		color: rgb(0, 0, 0) !important;
		border-bottom: 2px solid rgb(255, 179, 0) !important;
		font-weight: 500 !important;
	}
	:global(.dark .ProseMirror .ProseMirror-search-match) {
		background-color: rgb(102, 77, 3) !important;
		color: rgb(255, 255, 255) !important;
	}
	:global(.dark .ProseMirror .ProseMirror-active-search-match) {
		background-color: rgb(161, 123, 5) !important;
		color: rgb(255, 255, 255) !important;
	}
</style>
