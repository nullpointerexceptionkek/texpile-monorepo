<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { onDestroy, onMount } from 'svelte';
	import { getPdfViewerContext, type PdfViewerActions, type PdfSource } from './pdf-viewer/context.js';
	import { getPdfJs } from './pdf-viewer/pdfjs-singleton.js';
	import { PdfPresentationMode } from './pdf-viewer/PdfPresentationMode.js';
	import { rendererStyles } from './pdf-viewer/renderer-styles.js';

	interface Props {
		/** PDF source; falls back to the src from PdfViewer context. */
		src?: PdfSource;
		backgroundColor?: string;
		pageShadow?: string;
		scrollbarTrackColor?: string;
		scrollbarThumbColor?: string;
		scrollbarThumbHoverColor?: string;
		scrollbarWidth?: string;
		/** Dark mode: darkens the viewer chrome and renders the pages themselves dark by inverting the
		 *  page canvases (invert + hue-rotate, so colors stay recognizable). Reactive. */
		darkMode?: boolean;
		/** SyncTeX inverse search: fired on double-click with the page + position in PDF points, plus
		 *  the double-clicked word so the editor can anchor the jump on the actual text. */
		onPageClick?: (page: number, x: number, y: number, selectText?: string) => void;
	}

	let {
		src: srcProp,
		backgroundColor = '#e8e8e8',
		pageShadow = '0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
		scrollbarTrackColor = '#f1f1f1',
		scrollbarThumbColor = '#c1c1c1',
		scrollbarThumbHoverColor = '#a1a1a1',
		scrollbarWidth = '10px',
		darkMode = false,
		onPageClick
	}: Props = $props();

	const context = getPdfViewerContext();
	const { state: viewerState, _registerRenderer, _setSrcDataForDownload } = context;

	let src = $derived(srcProp ?? context.src);

	let hostEl: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let containerEl: HTMLDivElement | null = $state(null);
	let scrollContainerEl: HTMLDivElement | null = null;
	let mounted = $state(false);

	let viewer: import('./pdf-viewer/PDFViewerCore.js').PDFViewerCore | null = null;
	let findController: import('./pdf-viewer/FindController.js').FindController | null = null;

	const presentationMode = new PdfPresentationMode({
		onStateChange: (newState) => {
			viewerState.presentationMode = newState;
		},
		onPageChange: (pageNumber) => {
			// sync page changes in presentation mode back to the main viewer
			viewer?.scrollToPage(pageNumber);
		}
	});

	async function loadPdf(source: PdfSource) {
		if (!BROWSER || !scrollContainerEl) return;

		viewerState.loading = true;
		viewerState.error = null;

		if (viewer) {
			viewer.destroy();
			viewer = null;
		}

		scrollContainerEl.innerHTML = '';

		let newViewer: import('./pdf-viewer/PDFViewerCore.js').PDFViewerCore | null = null;

		try {
			const pdfjs = await getPdfJs();
			if (!pdfjs) return;

			const { PDFViewerCore } = await import('./pdf-viewer/PDFViewerCore.js');
			const { FindController } = await import('./pdf-viewer/FindController.js');
			const { EventBus } = await import('./pdf-viewer/EventBus.js');

			const eventBus = new EventBus();

			newViewer = new PDFViewerCore({
				container: scrollContainerEl,
				eventBus,
				initialScale: viewerState.scale,
				initialRotation: viewerState.rotation,
				onPageClick: (page, x, y, selectText) => onPageClick?.(page, x, y, selectText)
			});

			findController = new FindController(newViewer, eventBus);

			eventBus.on('scalechanged', (data: Record<string, unknown>) => {
				viewerState.scale = data.scale as number;
			});

			eventBus.on('rotationchanged', (data: Record<string, unknown>) => {
				viewerState.rotation = data.rotation as number;
			});

			eventBus.on('updateviewarea', (data: Record<string, unknown>) => {
				const location = data.location as { pageNumber: number };
				viewerState.currentPage = location.pageNumber;
			});

			eventBus.on('pagesloaded', (data: Record<string, unknown>) => {
				viewerState.totalPages = data.pagesCount as number;
			});

			eventBus.on('updatefindmatchescount', (data: Record<string, unknown>) => {
				const matchesCount = data.matchesCount as { current: number; total: number };
				viewerState.searchCurrent = matchesCount.current;
				viewerState.searchTotal = matchesCount.total;
			});

			let documentSource: string | { data: ArrayBuffer } | { data: Uint8Array };

			if (typeof source === 'string') {
				documentSource = source;
				_setSrcDataForDownload(null); // URL doesn't need copying
			} else if (source instanceof Blob) {
				const arrayBuffer = await source.arrayBuffer();
				_setSrcDataForDownload(arrayBuffer.slice(0)); // copy for download
				documentSource = { data: arrayBuffer };
			} else if (source instanceof ArrayBuffer) {
				_setSrcDataForDownload(source.slice(0)); // copy before PDF.js detaches it
				documentSource = { data: source };
			} else if (source instanceof Uint8Array) {
				_setSrcDataForDownload(new Uint8Array(source).buffer.slice(0) as ArrayBuffer); // copy for download
				documentSource = { data: source };
			} else {
				throw new Error('Invalid PDF source type');
			}

			const loadingTask = pdfjs.getDocument(documentSource);
			const loadedPdfDocument = await loadingTask.promise;

			await newViewer.setDocument(loadedPdfDocument);
			findController.setDocument(loadedPdfDocument);

			presentationMode.setDocument(loadedPdfDocument);

			viewer = newViewer;
			viewerState.loading = false;
		} catch (e) {
			if (newViewer) {
				newViewer.destroy();
				newViewer = null;
			}
			findController = null;

			const errorMessage = e instanceof Error ? e.message : 'Failed to load PDF';
			viewerState.error = errorMessage;
			viewerState.loading = false;
			context._onerror?.(errorMessage);
		}
	}

	const rendererActions: PdfViewerActions = {
		zoomIn: () => viewer?.zoomIn(),
		zoomOut: () => viewer?.zoomOut(),
		setScale: (scale: number) => {
			if (viewer) viewer.scale = scale;
		},
		rotateClockwise: () => viewer?.rotateClockwise(),
		rotateCounterClockwise: () => viewer?.rotateCounterClockwise(),
		goToPage: (page: number) => viewer?.scrollToPage(page),
		scrollToPosition: (page, x, y, w, h) => viewer?.scrollToPosition(page, x, y, w, h),
		search: async (query: string) => {
			if (!findController) return;
			viewerState.isSearching = true;
			viewerState.searchQuery = query;
			await findController.find({
				query,
				highlightAll: true,
				caseSensitive: false
			});
			viewerState.isSearching = false;
		},
		searchNext: () => findController?.findNext(),
		searchPrevious: () => findController?.findPrevious(),
		clearSearch: () => {
			if (findController) {
				findController.reset();
				viewerState.searchQuery = '';
				viewerState.searchCurrent = 0;
				viewerState.searchTotal = 0;
			}
		},
		download: async () => {}, // download is handled by PdfViewer, not the renderer
		enterPresentationMode: async () => {
			presentationMode.setCurrentPage(viewerState.currentPage);
			return presentationMode.request();
		},
		exitPresentationMode: async () => {
			await presentationMode.exit();
		}
	};

	onMount(async () => {
		if (BROWSER && hostEl) {
			// shadow root for style isolation
			shadowRoot = hostEl.attachShadow({ mode: 'open' });

			const styleEl = document.createElement('style');
			styleEl.textContent = rendererStyles;
			shadowRoot.appendChild(styleEl);

			const container = document.createElement('div');
			container.className = 'pdf-renderer-container';
			containerEl = container;

			scrollContainerEl = document.createElement('div');
			scrollContainerEl.className = 'pdf-scroll-container';
			container.appendChild(scrollContainerEl);

			shadowRoot.appendChild(container);

			_registerRenderer(rendererActions);

			mounted = true;
		}
	});

	// apply, and re-apply on change (live theme toggle), the customization CSS properties
	// and the dark-mode class on the shadow container
	$effect(() => {
		const container = containerEl;
		if (!container) return;
		container.style.setProperty('--pdf-background-color', backgroundColor);
		container.style.setProperty('--pdf-page-shadow', pageShadow);
		container.style.setProperty('--pdf-scrollbar-track-color', scrollbarTrackColor);
		container.style.setProperty('--pdf-scrollbar-thumb-color', scrollbarThumbColor);
		container.style.setProperty('--pdf-scrollbar-thumb-hover-color', scrollbarThumbHoverColor);
		container.style.setProperty('--pdf-scrollbar-width', scrollbarWidth);
		container.classList.toggle('pdf-dark', darkMode);
	});

	$effect(() => {
		if (BROWSER && src && scrollContainerEl && mounted) {
			loadPdf(src);
		}
	});

	onDestroy(() => {
		if (viewer) {
			viewer.destroy();
			viewer = null;
		}
		findController = null;
		presentationMode.destroy();
		// the worker is a global singleton, not cleaned up per-component; destroyPdfJs() fully cleans up
	});
</script>

<div bind:this={hostEl} class="pdf-renderer-host"></div>

<style>
	.pdf-renderer-host {
		display: block;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
