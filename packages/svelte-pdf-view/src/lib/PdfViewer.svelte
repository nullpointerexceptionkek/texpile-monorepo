<script lang="ts" module>
	export { default as Toolbar } from './PdfToolbar.svelte';
	export { default as Renderer } from './PdfRenderer.svelte';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		setPdfViewerContext,
		PresentationModeState,
		type PdfViewerState,
		type PdfViewerActions,
		type PdfSource
	} from './pdf-viewer/context.js';

	interface Props {
		/** PDF source - URL string, ArrayBuffer, Uint8Array, or Blob */
		src: PdfSource;
		/** logical-document id: unchanged across a src change keeps scroll (recompile), changed resets it */
		documentKey?: string | number;
		/** Initial scale (default: 1.0) */
		scale?: number;
		/** Custom filename for PDF download (default: extracted from URL or 'document.pdf') */
		downloadFilename?: string;
		/** Callback when PDF fails to load */
		onerror?: (error: string) => void;
		class?: string;
		/** Children (toolbar and renderer) */
		children?: Snippet;
	}

	let { src, documentKey, scale: initialScale = 1.0, downloadFilename, onerror, class: className = '', children }: Props = $props();

	// download needs its own copy of binary source data (PDF.js detaches ArrayBuffers);
	// set by PdfRenderer before it hands the data to PDF.js
	let srcDataForDownload = $state<ArrayBuffer | null>(null);

	let viewerState = $state<PdfViewerState>({
		loading: true,
		error: null,
		totalPages: 0,
		currentPage: 1,
		scale: initialScale,
		rotation: 0,
		searchQuery: '',
		searchCurrent: 0,
		searchTotal: 0,
		isSearching: false,
		presentationMode: PresentationModeState.NORMAL
	});

	let rendererActions: PdfViewerActions | null = null;

	async function downloadPdf(filenameOverride?: string) {
		const downloadName =
			filenameOverride || downloadFilename || (typeof src === 'string' ? src.split('/').pop() : 'document.pdf') || 'document.pdf';

		let blob: Blob;

		if (typeof src === 'string') {
			// fetch first: the download attribute is ignored for cross-origin URLs
			try {
				const response = await fetch(src);
				blob = await response.blob();
			} catch {
				// fallback for same-origin URLs if fetch fails
				const link = document.createElement('a');
				link.href = src;
				link.download = downloadName;
				link.click();
				return;
			}
		} else if (src instanceof Blob) {
			blob = src;
		} else if (srcDataForDownload) {
			// the pre-copied data; the original buffer gets detached by PDF.js
			blob = new Blob([srcDataForDownload], { type: 'application/pdf' });
		} else {
			console.error('Cannot download: no valid source data available');
			return;
		}

		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = downloadName;
		link.click();
		URL.revokeObjectURL(url);
	}

	const actions: PdfViewerActions = {
		zoomIn: () => rendererActions?.zoomIn(),
		zoomOut: () => rendererActions?.zoomOut(),
		fitWidth: () => rendererActions?.fitWidth(),
		setScale: (scale: number) => rendererActions?.setScale(scale),
		rotateClockwise: () => rendererActions?.rotateClockwise(),
		rotateCounterClockwise: () => rendererActions?.rotateCounterClockwise(),
		goToPage: (page: number) => rendererActions?.goToPage(page),
		scrollToPosition: (page, x, y, w, h) => rendererActions?.scrollToPosition?.(page, x, y, w, h),
		search: async (query: string) => {
			if (rendererActions) {
				await rendererActions.search(query);
			}
		},
		searchNext: () => rendererActions?.searchNext(),
		searchPrevious: () => rendererActions?.searchPrevious(),
		clearSearch: () => rendererActions?.clearSearch(),
		download: downloadPdf,
		enterPresentationMode: async () => {
			if (rendererActions) {
				return rendererActions.enterPresentationMode();
			}
			return false;
		},
		exitPresentationMode: async () => {
			if (rendererActions) {
				await rendererActions.exitPresentationMode();
			}
		}
	};

	setPdfViewerContext({
		state: viewerState,
		actions,
		get src() {
			return src;
		},
		get documentKey() {
			return documentKey;
		},
		_registerRenderer: (renderer: PdfViewerActions) => {
			rendererActions = renderer;
		},
		_onerror: onerror,
		_setSrcDataForDownload: (data: ArrayBuffer | null) => {
			srcDataForDownload = data;
		}
	});
</script>

<div class="pdf-viewer-container {className}">
	<!-- loading is only ever true before the first document lands; reloads swap in place -->
	{#if viewerState.loading}
		<div class="pdf-loading">Loading PDF...</div>
	{:else if viewerState.error}
		<div class="pdf-error">Error: {viewerState.error}</div>
	{/if}

	{#if children}
		{@render children()}
	{:else}
		{#await import('./PdfToolbar.svelte') then { default: Toolbar }}
			<Toolbar />
		{/await}
		{#await import('./PdfRenderer.svelte') then { default: Renderer }}
			<Renderer {src} />
		{/await}
	{/if}
</div>

<style>
	.pdf-viewer-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		background-color: var(--pdf-viewer-bg, #f0f0f0);
		overflow: hidden;
		/* contain the absolutely-positioned .pdf-loading / .pdf-error so they center inside this
		   pane, not the viewport (otherwise they render over the editor) */
		position: relative;
	}

	.pdf-loading,
	.pdf-error {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--pdf-toolbar-muted, #666);
		font-size: 1rem;
		z-index: 10;
	}

	.pdf-error {
		color: #dc3545;
	}
</style>
