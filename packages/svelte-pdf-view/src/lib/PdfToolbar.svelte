<script lang="ts">
	import {
		ZoomIn,
		ZoomOut,
		MoveHorizontal,
		RotateCcw,
		RotateCw,
		Search,
		ChevronLeft,
		ChevronRight,
		Download,
		Presentation
	} from '@lucide/svelte';
	import { getPdfViewerContext } from './pdf-viewer/context.js';

	const { state: viewerState, actions } = getPdfViewerContext();

	let searchInput = $state('');

	function handlePageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const pageNum = parseInt(input.value, 10);
		if (pageNum >= 1 && pageNum <= viewerState.totalPages) {
			actions.goToPage(pageNum);
		}
	}

	async function handleSearch() {
		if (!searchInput.trim()) {
			actions.clearSearch();
			return;
		}
		await actions.search(searchInput);
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				actions.searchPrevious();
			} else if (viewerState.searchTotal > 0) {
				actions.searchNext();
			} else {
				handleSearch();
			}
		}
	}
</script>

<div class="pdf-toolbar">
	<div class="pdf-toolbar-group">
		<input
			type="number"
			value={viewerState.currentPage}
			min="1"
			max={viewerState.totalPages}
			onchange={handlePageChange}
			aria-label="Current page"
		/>
		<span class="page-info">/ {viewerState.totalPages}</span>
	</div>

	<div class="pdf-toolbar-group">
		<button onclick={() => actions.zoomOut()} aria-label="Zoom out" title="Zoom Out">
			<ZoomOut size={16} />
		</button>
		<span class="zoom-level">{Math.round(viewerState.scale * 100)}%</span>
		<button onclick={() => actions.zoomIn()} aria-label="Zoom in" title="Zoom In">
			<ZoomIn size={16} />
		</button>
		<button onclick={() => actions.fitWidth()} aria-label="Fit width" title="Fit Width">
			<MoveHorizontal size={16} />
		</button>
	</div>

	<div class="pdf-toolbar-group">
		<button onclick={() => actions.rotateCounterClockwise()} aria-label="Rotate counter-clockwise" title="Rotate Left">
			<RotateCcw size={16} />
		</button>
		<button onclick={() => actions.rotateClockwise()} aria-label="Rotate clockwise" title="Rotate Right">
			<RotateCw size={16} />
		</button>
	</div>

	<div class="pdf-toolbar-group">
		<input
			type="text"
			class="search-input"
			placeholder="Search..."
			bind:value={searchInput}
			onkeydown={handleSearchKeydown}
			aria-label="Search in document"
		/>
		<button onclick={handleSearch} disabled={viewerState.isSearching} aria-label="Search" title="Search">
			<Search size={16} />
		</button>
		{#if viewerState.searchTotal > 0}
			<button onclick={() => actions.searchPrevious()} aria-label="Previous match" title="Previous">
				<ChevronLeft size={16} />
			</button>
			<button onclick={() => actions.searchNext()} aria-label="Next match" title="Next">
				<ChevronRight size={16} />
			</button>
			<span class="match-info">{viewerState.searchCurrent}/{viewerState.searchTotal}</span>
		{/if}
	</div>

	<div class="pdf-toolbar-group">
		<button onclick={() => actions.enterPresentationMode()} aria-label="Presentation Mode" title="Presentation Mode">
			<Presentation size={16} />
		</button>
		<button onclick={() => actions.download()} aria-label="Download PDF" title="Download">
			<Download size={16} />
		</button>
	</div>
</div>

<style>
	/* all colors go through --pdf-toolbar-* custom properties (light defaults) so a host app
	   can theme the toolbar */
	.pdf-toolbar {
		display: flex;
		/* safe center: stays centered when it fits, but aligns to the start (no groups clipped
		   past the left edge) once it overflows and scrolls */
		justify-content: safe center;
		align-items: center;
		/* matches the editor (ProseMirror/CodeMirror) and draft toolbars: a 40px bar, border included */
		min-height: 40px;
		box-sizing: border-box;
		gap: 0.75rem;
		padding: 0 0.75rem;
		background-color: var(--pdf-toolbar-bg, #ffffff);
		color: var(--pdf-toolbar-fg, #333);
		flex-shrink: 0;
		/* when the window is too narrow, scroll horizontally instead of wrapping into a second
		   row (which shifted the whole viewer down and read as a layout glitch) */
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: thin;
		border-bottom: 1px solid var(--pdf-toolbar-border, #e0e0e0);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.pdf-toolbar-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.pdf-toolbar button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--pdf-toolbar-btn-border, #e0e0e0);
		background-color: var(--pdf-toolbar-btn-bg, #fafafa);
		color: var(--pdf-toolbar-btn-fg, #555);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pdf-toolbar button:hover:not(:disabled) {
		background-color: var(--pdf-toolbar-btn-hover-bg, #f0f0f0);
		border-color: var(--pdf-toolbar-btn-hover-border, #d0d0d0);
		color: var(--pdf-toolbar-fg, #333);
	}

	.pdf-toolbar button:active:not(:disabled) {
		background-color: var(--pdf-toolbar-btn-active-bg, #e8e8e8);
	}

	.pdf-toolbar button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pdf-toolbar input[type='text'],
	.pdf-toolbar input[type='number'] {
		height: 28px;
		padding: 0 0.5rem;
		border: 1px solid var(--pdf-toolbar-input-border, #e0e0e0);
		border-radius: 6px;
		background-color: var(--pdf-toolbar-input-bg, #fff);
		color: var(--pdf-toolbar-fg, #333);
		font-size: 0.8rem;
		outline: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.pdf-toolbar input[type='text']:focus,
	.pdf-toolbar input[type='number']:focus {
		border-color: var(--pdf-toolbar-accent, #0066cc);
		box-shadow: 0 0 0 2px var(--pdf-toolbar-accent-ring, rgba(0, 102, 204, 0.15));
	}

	.pdf-toolbar input[type='number'] {
		width: 34px;
		font-size: 0.75rem;
		text-align: center;
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.pdf-toolbar input[type='number']::-webkit-outer-spin-button,
	.pdf-toolbar input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.pdf-toolbar .search-input {
		width: 160px;
	}

	.pdf-toolbar .zoom-level {
		min-width: 48px;
		text-align: center;
		font-size: 0.8rem;
		color: var(--pdf-toolbar-muted, #666);
		font-weight: 500;
	}

	.pdf-toolbar .page-info {
		font-size: 0.8rem;
		color: var(--pdf-toolbar-muted, #888);
		margin-left: 0.25rem;
	}

	.pdf-toolbar .match-info {
		font-size: 0.75rem;
		color: var(--pdf-toolbar-muted, #888);
		min-width: 60px;
		margin-left: 0.25rem;
	}
</style>
