<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { onDestroy, onMount } from 'svelte';
	import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Search, ChevronLeft, ChevronRight } from '@lucide/svelte';

	interface Props {
		src: string;
		/** Initial scale (default: 1.0) */
		scale?: number;
		class?: string;
	}

	let { src, scale: initialScale = 1.0, class: className = '' }: Props = $props();

	let scrollContainerEl: HTMLDivElement | undefined = $state();
	let mounted = $state(false);

	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentScale = $state(initialScale);
	let currentRotation = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(0);

	let searchQuery = $state('');
	let searchCurrent = $state(0);
	let searchTotal = $state(0);
	let isSearching = $state(false);

	let viewer: import('./pdf-viewer/PDFViewerCore.js').PDFViewerCore | null = null;
	let findController: import('./pdf-viewer/FindController.js').FindController | null = null;

	async function loadPdf(url: string) {
		if (!BROWSER || !scrollContainerEl) return;

		loading = true;
		error = null;

		try {
			const { getPdfJs } = await import('./pdf-viewer/pdfjs-singleton.js');
			const pdfjs = await getPdfJs();
			if (!pdfjs) return;

			const { PDFViewerCore } = await import('./pdf-viewer/PDFViewerCore.js');
			const { FindController } = await import('./pdf-viewer/FindController.js');
			const { EventBus } = await import('./pdf-viewer/EventBus.js');

			if (viewer) {
				viewer.destroy();
			}

			const eventBus = new EventBus();

			const newViewer = new PDFViewerCore({
				container: scrollContainerEl,
				eventBus,
				initialScale: currentScale,
				initialRotation: currentRotation
			});

			findController = new FindController(newViewer, eventBus);

			eventBus.on('scalechanged', (data: Record<string, unknown>) => {
				currentScale = data.scale as number;
			});

			eventBus.on('rotationchanged', (data: Record<string, unknown>) => {
				currentRotation = data.rotation as number;
			});

			eventBus.on('updateviewarea', (data: Record<string, unknown>) => {
				const location = data.location as { pageNumber: number };
				currentPage = location.pageNumber;
			});

			eventBus.on('pagesloaded', (data: Record<string, unknown>) => {
				totalPages = data.pagesCount as number;
			});

			eventBus.on('updatefindmatchescount', (data: Record<string, unknown>) => {
				const matchesCount = data.matchesCount as { current: number; total: number };
				searchCurrent = matchesCount.current;
				searchTotal = matchesCount.total;
			});

			const loadingTask = pdfjs.getDocument(url);
			const pdfDocument = await loadingTask.promise;

			await newViewer.setDocument(pdfDocument);

			// the find controller needs the document for text extraction
			findController.setDocument(pdfDocument);

			viewer = newViewer;

			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load PDF';
			loading = false;
		}
	}

	function handleZoomIn() {
		if (viewer) {
			viewer.zoomIn();
		}
	}

	function handleZoomOut() {
		if (viewer) {
			viewer.zoomOut();
		}
	}

	function handleRotateRight() {
		if (viewer) {
			viewer.rotateClockwise();
		}
	}

	function handleRotateLeft() {
		if (viewer) {
			viewer.rotateCounterClockwise();
		}
	}

	function handlePageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const pageNum = parseInt(input.value, 10);
		if (viewer && pageNum >= 1 && pageNum <= totalPages) {
			viewer.scrollToPage(pageNum);
		}
	}

	async function handleSearch() {
		if (!findController || !searchQuery.trim()) {
			searchCurrent = 0;
			searchTotal = 0;
			return;
		}

		isSearching = true;
		await findController.find({
			query: searchQuery,
			highlightAll: true,
			caseSensitive: false
		});
		isSearching = false;
	}

	function handleSearchNext() {
		if (findController) {
			findController.findNext();
		}
	}

	function handleSearchPrev() {
		if (findController) {
			findController.findPrevious();
		}
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				handleSearchPrev();
			} else if (searchTotal > 0) {
				handleSearchNext();
			} else {
				handleSearch();
			}
		}
	}

	$effect(() => {
		if (BROWSER && src && scrollContainerEl && mounted) {
			loadPdf(src);
		}
	});

	onMount(() => {
		mounted = true;
	});

	onDestroy(() => {
		if (viewer) {
			viewer.destroy();
			viewer = null;
		}
		findController = null;
		// the worker is a global singleton, not cleaned up per-component; destroyPdfJs() fully cleans up
	});
</script>

<div class="pdf-viewer-container {className}">
	{#if loading}
		<div class="pdf-loading">
			<span>Loading PDF...</span>
		</div>
	{:else if error}
		<div class="pdf-error">
			<span>Error: {error}</span>
		</div>
	{:else}
		<div class="pdf-toolbar">
			<div class="pdf-toolbar-group">
				<input type="number" value={currentPage} min="1" max={totalPages} onchange={handlePageChange} aria-label="Current page" />
				<span class="page-info">/ {totalPages}</span>
			</div>

			<div class="pdf-toolbar-group">
				<button onclick={handleZoomOut} aria-label="Zoom out" title="Zoom Out"><ZoomOut size={18} /></button>
				<span class="zoom-level">{Math.round(currentScale * 100)}%</span>
				<button onclick={handleZoomIn} aria-label="Zoom in" title="Zoom In"><ZoomIn size={18} /></button>
			</div>

			<div class="pdf-toolbar-group">
				<button onclick={handleRotateLeft} aria-label="Rotate counter-clockwise" title="Rotate Left">
					<RotateCcw size={18} />
				</button>
				<button onclick={handleRotateRight} aria-label="Rotate clockwise" title="Rotate Right">
					<RotateCw size={18} />
				</button>
			</div>

			<div class="pdf-toolbar-group">
				<input
					type="text"
					class="search-input"
					placeholder="Search..."
					bind:value={searchQuery}
					onkeydown={handleSearchKeydown}
					aria-label="Search in document"
				/>
				<button onclick={handleSearch} disabled={isSearching} aria-label="Search" title="Search">
					<Search size={18} />
				</button>
				{#if searchTotal > 0}
					<button onclick={handleSearchPrev} aria-label="Previous match" title="Previous">
						<ChevronLeft size={18} />
					</button>
					<button onclick={handleSearchNext} aria-label="Next match" title="Next">
						<ChevronRight size={18} />
					</button>
					<span class="match-info">{searchCurrent}/{searchTotal}</span>
				{/if}
			</div>
		</div>
	{/if}

	<div class="pdf-scroll-container" bind:this={scrollContainerEl}></div>
</div>
