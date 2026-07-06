/* Copyright 2024 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** main viewer managing all pages in a scroll container; derivative work based on PDF.js pdf_viewer.js. */
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { EventBus } from './EventBus.js';
import { PDFPageView, RenderingStates } from './PDFPageView.js';
import { SimpleLinkService } from './SimpleLinkService.js';

export interface PDFViewerOptions {
	container: HTMLElement;
	eventBus?: EventBus;
	initialScale?: number;
	initialRotation?: number;
	/** SyncTeX inverse search: fired on double-click with the page + position in PDF points (top-left
	 *  origin), plus the double-clicked word so the editor can anchor the jump on the actual text. */
	onPageClick?: (page: number, x: number, y: number, selectText?: string) => void;
}

const DEFAULT_SCALE = 1.0;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE_DELTA = 0.1;

// pages to render around the visible ones
const PAGES_TO_PRERENDER = 2;

export class PDFViewerCore {
	readonly container: HTMLElement;
	readonly viewer: HTMLDivElement;
	readonly eventBus: EventBus;

	private pdfDocument: PDFDocumentProxy | null = null;
	private pages: PDFPageView[] = [];
	private currentScale: number;
	private currentRotation: number;
	private scrollAbortController: AbortController | null = null;
	private renderingQueue: Set<number> = new Set();
	private isRendering = false;
	private onPageClick?: (page: number, x: number, y: number, selectText?: string) => void;

	private linkService: SimpleLinkService;

	constructor(options: PDFViewerOptions) {
		this.container = options.container;
		this.eventBus = options.eventBus ?? new EventBus();
		this.currentScale = options.initialScale ?? DEFAULT_SCALE;
		this.currentRotation = options.initialRotation ?? 0;
		this.onPageClick = options.onPageClick;

		this.viewer = document.createElement('div');
		this.viewer.className = 'pdfViewer';
		this.container.appendChild(this.viewer);

		this.linkService = new SimpleLinkService({
			eventBus: this.eventBus
		});

		this.setupScrollListener();
		this.setupInverseClick();
	}

	// SyncTeX inverse search: a double-click on a page reports its position in PDF points
	private setupInverseClick(): void {
		this.viewer.addEventListener(
			'dblclick',
			(e) => {
				if (!this.onPageClick) return;
				const pageDiv = (e.target as HTMLElement)?.closest?.('.page') as HTMLElement | null;
				if (!pageDiv) return;
				const pageNumber = Number(pageDiv.getAttribute('data-page-number'));
				const pageView = this.pages[pageNumber - 1];
				if (!pageView) return;
				const rect = pageDiv.getBoundingClientRect();
				const { x, y } = pageView.pixelToPdf(e.clientX - rect.left, e.clientY - rect.top);
				// grab the word the double-click selected so the editor can snap to that exact text.
				// The pages live in a shadow root, so read the selection from there (ShadowRoot.getSelection
				// is non-standard but present in Chromium/Electron); fall back to the window selection.
				const root = pageDiv.getRootNode() as { getSelection?: () => Selection | null };
				const sel = root.getSelection?.() ?? window.getSelection?.();
				// a double-click selects one word; anything long or multi-line is a misbehaving or drag
				// selection, so send nothing rather than a garbage anchor
				let selectText: string | undefined = sel?.toString().trim() || undefined;
				if (selectText && (selectText.length > 80 || /\n/.test(selectText))) selectText = undefined;
				this.onPageClick(pageNumber, x, y, selectText);
			},
			{ signal: this.scrollAbortController!.signal }
		);
	}

	// SyncTeX forward search: scroll a box into view and flash a highlight over it.
	// (x, y) is the SyncTeX box origin: x = line start, y = baseline (not the top). Convert both
	// corners through the page transform (a size can't go through a rotating point transform) and
	// take their axis-aligned bounding rect, which stays correct on rotated pages.
	scrollToPosition(pageNumber: number, x: number, y: number, width = 0, height = 0): void {
		const pageView = this.pages[pageNumber - 1];
		if (!pageView) return;
		const a = pageView.pdfToPixel(x, y - height);
		const b = pageView.pdfToPixel(x + width, y);
		const left = Math.min(a.x, b.x);
		const topPx = Math.min(a.y, b.y);
		const boxW = Math.abs(b.x - a.x);
		const boxH = Math.abs(b.y - a.y);
		const pageRect = pageView.div.getBoundingClientRect();
		const contRect = this.container.getBoundingClientRect();
		const top = this.container.scrollTop + (pageRect.top - contRect.top) + topPx - this.container.clientHeight / 3;
		this.container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
		pageView.highlight(left, topPx, boxW, boxH);
	}

	private setupScrollListener(): void {
		this.scrollAbortController?.abort();
		this.scrollAbortController = new AbortController();

		let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

		this.container.addEventListener(
			'scroll',
			() => {
				if (scrollTimeout) {
					clearTimeout(scrollTimeout);
				}
				scrollTimeout = setTimeout(() => {
					this.updateVisiblePages();
				}, 100);
			},
			{ signal: this.scrollAbortController.signal }
		);
	}

	async setDocument(pdfDocument: PDFDocumentProxy): Promise<void> {
		this.cleanup();

		this.pdfDocument = pdfDocument;
		const numPages = pdfDocument.numPages;

		this.linkService.setDocument(pdfDocument);
		this.linkService.setViewer(this);

		for (let i = 1; i <= numPages; i++) {
			const page = await pdfDocument.getPage(i);
			const viewport = page.getViewport({
				scale: this.currentScale,
				rotation: this.currentRotation
			});

			const pageView = new PDFPageView({
				container: this.viewer,
				id: i,
				defaultViewport: viewport,
				eventBus: this.eventBus,
				scale: this.currentScale,
				rotation: this.currentRotation,
				linkService: this.linkService
			});

			pageView.setPdfPage(page);
			this.pages.push(pageView);
		}

		this.eventBus.dispatch('pagesloaded', { pagesCount: numPages });

		this.updateVisiblePages();
	}

	private getVisiblePages(): { first: number; last: number; ids: Set<number> } {
		const containerRect = this.container.getBoundingClientRect();
		const containerTop = this.container.scrollTop;
		const containerBottom = containerTop + containerRect.height;

		let firstVisible = -1;
		let lastVisible = -1;
		const visibleIds = new Set<number>();

		let currentTop = 0;
		for (let i = 0; i < this.pages.length; i++) {
			const page = this.pages[i];
			const pageBottom = currentTop + page.height + 10; // 10px margin

			if (pageBottom >= containerTop && currentTop <= containerBottom) {
				if (firstVisible === -1) {
					firstVisible = i;
				}
				lastVisible = i;
				visibleIds.add(i + 1); // Page numbers are 1-indexed
			}

			currentTop = pageBottom;
		}

		return {
			first: firstVisible === -1 ? 0 : firstVisible,
			last: lastVisible === -1 ? 0 : lastVisible,
			ids: visibleIds
		};
	}

	private updateVisiblePages(): void {
		if (!this.pdfDocument || this.pages.length === 0) return;

		const visible = this.getVisiblePages();

		const startPage = Math.max(0, visible.first - PAGES_TO_PRERENDER);
		const endPage = Math.min(this.pages.length - 1, visible.last + PAGES_TO_PRERENDER);

		for (let i = startPage; i <= endPage; i++) {
			const page = this.pages[i];
			if (page.renderingState === RenderingStates.INITIAL) {
				this.renderingQueue.add(i);
			}
		}

		this.processRenderingQueue();

		this.eventBus.dispatch('updateviewarea', {
			location: {
				pageNumber: visible.first + 1,
				scale: this.currentScale,
				rotation: this.currentRotation
			}
		});
	}

	private async processRenderingQueue(): Promise<void> {
		if (this.isRendering || this.renderingQueue.size === 0) return;

		this.isRendering = true;

		while (this.renderingQueue.size > 0) {
			const pageIndex = this.renderingQueue.values().next().value as number;
			this.renderingQueue.delete(pageIndex);

			const page = this.pages[pageIndex];
			if (page && page.renderingState === RenderingStates.INITIAL) {
				await page.draw();
			}
		}

		this.isRendering = false;
	}

	get scale(): number {
		return this.currentScale;
	}

	set scale(value: number) {
		const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
		if (newScale === this.currentScale) return;

		this.currentScale = newScale;

		for (const page of this.pages) {
			page.update({ scale: newScale });
		}

		this.eventBus.dispatch('scalechanged', { scale: newScale });
		this.updateVisiblePages();
	}

	get rotation(): number {
		return this.currentRotation;
	}

	set rotation(value: number) {
		const newRotation = ((value % 360) + 360) % 360;
		if (newRotation === this.currentRotation) return;

		this.currentRotation = newRotation;

		for (const page of this.pages) {
			page.update({ rotation: newRotation });
		}

		this.eventBus.dispatch('rotationchanged', { rotation: newRotation });
		this.updateVisiblePages();
	}

	zoomIn(): void {
		this.scale = this.currentScale + DEFAULT_SCALE_DELTA;
	}

	zoomOut(): void {
		this.scale = this.currentScale - DEFAULT_SCALE_DELTA;
	}

	rotateClockwise(): void {
		this.rotation = this.currentRotation + 90;
	}

	rotateCounterClockwise(): void {
		this.rotation = this.currentRotation - 90;
	}

	scrollToPage(pageNumber: number): void {
		if (pageNumber < 1 || pageNumber > this.pages.length) return;

		const pageView = this.pages[pageNumber - 1];
		pageView.div.scrollIntoView({ behavior: 'smooth', block: 'start' });

		this.eventBus.dispatch('pagechanged', { pageNumber });
	}

	get pagesCount(): number {
		return this.pages.length;
	}

	get currentPageNumber(): number {
		const visible = this.getVisiblePages();
		return visible.first + 1;
	}

	getPageView(pageIndex: number): PDFPageView | undefined {
		return this.pages[pageIndex];
	}

	cleanup(): void {
		for (const page of this.pages) {
			page.destroy();
		}
		this.pages = [];
		this.renderingQueue.clear();

		this.viewer.innerHTML = '';

		this.pdfDocument = null;
	}

	destroy(): void {
		this.scrollAbortController?.abort();
		this.cleanup();
		this.eventBus.destroy();
		this.viewer.remove();
	}
}
