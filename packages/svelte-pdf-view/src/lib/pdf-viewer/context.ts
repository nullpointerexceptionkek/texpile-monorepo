import { getContext, setContext } from 'svelte';

const PDF_VIEWER_CONTEXT_KEY = Symbol('pdf-viewer');

export type PdfSource = string | ArrayBuffer | Uint8Array | Blob;

export enum PresentationModeState {
	UNKNOWN = 0,
	NORMAL = 1,
	CHANGING = 2,
	FULLSCREEN = 3
}

export interface PdfViewerState {
	loading: boolean;
	error: string | null;
	totalPages: number;
	currentPage: number;

	scale: number;
	rotation: number;

	searchQuery: string;
	searchCurrent: number;
	searchTotal: number;
	isSearching: boolean;

	presentationMode: PresentationModeState;
}

export interface PdfViewerActions {
	zoomIn: () => void;
	zoomOut: () => void;
	setScale: (scale: number) => void;
	rotateClockwise: () => void;
	rotateCounterClockwise: () => void;
	goToPage: (page: number) => void;
	search: (query: string) => Promise<void>;
	searchNext: () => void;
	searchPrevious: () => void;
	clearSearch: () => void;
	download: (filename?: string) => Promise<void>;
	enterPresentationMode: () => Promise<boolean>;
	exitPresentationMode: () => Promise<void>;
	/** SyncTeX forward search: scroll to + briefly highlight a position on a page (PDF points, top-left origin). */
	scrollToPosition?: (page: number, x: number, y: number, width?: number, height?: number) => void;
}

export interface PdfViewerContext {
	state: PdfViewerState;
	actions: PdfViewerActions;
	src: PdfSource;
	_registerRenderer: (renderer: PdfViewerActions) => void;
	_onerror?: (error: string) => void;
	// internal: stores a copy of binary data for download (PDF.js detaches ArrayBuffers)
	_setSrcDataForDownload: (data: ArrayBuffer | null) => void;
}

export function setPdfViewerContext(ctx: PdfViewerContext): void {
	setContext(PDF_VIEWER_CONTEXT_KEY, ctx);
}

export function getPdfViewerContext(): PdfViewerContext {
	const ctx = getContext<PdfViewerContext>(PDF_VIEWER_CONTEXT_KEY);
	if (!ctx) {
		throw new Error('PdfToolbar must be used inside a PdfViewer component');
	}
	return ctx;
}
