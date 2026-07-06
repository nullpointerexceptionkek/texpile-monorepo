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

/** PDF navigation for annotation links; adapted from PDF.js pdf_link_service.js. */
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { EventBus } from './EventBus.js';

const DEFAULT_LINK_REL = 'noopener noreferrer nofollow';

export interface SimpleLinkServiceOptions {
	eventBus: EventBus;
	externalLinkTarget?: number;
	externalLinkRel?: string;
}

export const LinkTarget = {
	NONE: 0,
	SELF: 1,
	BLANK: 2,
	PARENT: 3,
	TOP: 4
} as const;

export class SimpleLinkService {
	readonly eventBus: EventBus;
	private externalLinkTarget: number;
	private externalLinkRel: string;

	private pdfDocument: PDFDocumentProxy | null = null;
	private pdfViewer: { scrollToPage: (page: number) => void; pagesCount: number } | null = null;

	externalLinkEnabled = true;

	constructor(options: SimpleLinkServiceOptions) {
		this.eventBus = options.eventBus;
		this.externalLinkTarget = options.externalLinkTarget ?? LinkTarget.BLANK;
		this.externalLinkRel = options.externalLinkRel ?? DEFAULT_LINK_REL;
	}

	setDocument(pdfDocument: PDFDocumentProxy | null): void {
		this.pdfDocument = pdfDocument;
	}

	setViewer(pdfViewer: { scrollToPage: (page: number) => void; pagesCount: number }): void {
		this.pdfViewer = pdfViewer;
	}

	get pagesCount(): number {
		return this.pdfViewer?.pagesCount ?? 0;
	}

	get page(): number {
		return this.pdfViewer ? 1 : 0;
	}

	set page(value: number) {
		this.goToPage(value);
	}

	get rotation(): number {
		return 0;
	}

	set rotation(_value: number) {
		// not implemented, rotation is handled by the viewer
	}

	get isInPresentationMode(): boolean {
		return false;
	}

	async goToDestination(dest: unknown): Promise<void> {
		if (!this.pdfDocument || !this.pdfViewer) {
			return;
		}

		let explicitDest: unknown[];

		if (typeof dest === 'string') {
			// named destination: look it up
			explicitDest = (await this.pdfDocument.getDestination(dest)) as unknown[];
			if (!explicitDest) {
				console.warn(`SimpleLinkService: "${dest}" is not a valid destination.`);
				return;
			}
		} else if (Array.isArray(dest)) {
			explicitDest = dest;
		} else {
			console.warn('SimpleLinkService: Invalid destination:', dest);
			return;
		}

		const destRef = explicitDest[0];
		let pageNumber: number;

		if (typeof destRef === 'object' && destRef !== null && 'num' in destRef && 'gen' in destRef) {
			// a reference object: resolve to page index
			pageNumber = (await this.pdfDocument.getPageIndex(destRef as { num: number; gen: number })) + 1;
		} else if (typeof destRef === 'number') {
			// already a (0-indexed) page number
			pageNumber = destRef + 1;
		} else {
			console.warn('SimpleLinkService: Invalid destination reference:', destRef);
			return;
		}

		if (pageNumber < 1 || pageNumber > this.pagesCount) {
			console.warn(`SimpleLinkService: Page ${pageNumber} out of range.`);
			return;
		}

		this.pdfViewer.scrollToPage(pageNumber);
		this.eventBus.dispatch('navigateto', { dest: explicitDest, pageNumber });
	}

	goToPage(pageNumber: number): void {
		if (!this.pdfViewer) {
			return;
		}
		if (pageNumber < 1 || pageNumber > this.pagesCount) {
			console.warn(`SimpleLinkService: Page ${pageNumber} out of range.`);
			return;
		}
		this.pdfViewer.scrollToPage(pageNumber);
		this.eventBus.dispatch('pagechanged', { pageNumber });
	}

	getDestinationHash(dest: unknown): string {
		if (typeof dest === 'string') {
			return `#${escape(dest)}`;
		}
		if (Array.isArray(dest)) {
			return `#${escape(JSON.stringify(dest))}`;
		}
		return '#';
	}

	getAnchorUrl(anchor: string): string {
		return anchor;
	}

	addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow = false): void {
		if (!url || typeof url !== 'string') {
			return;
		}

		link.href = url;
		link.rel = this.externalLinkRel;

		if (newWindow || this.externalLinkTarget === LinkTarget.BLANK) {
			link.target = '_blank';
		} else if (this.externalLinkTarget === LinkTarget.SELF) {
			link.target = '_self';
		} else if (this.externalLinkTarget === LinkTarget.PARENT) {
			link.target = '_parent';
		} else if (this.externalLinkTarget === LinkTarget.TOP) {
			link.target = '_top';
		}
	}

	executeNamedAction(action: string): void {
		switch (action) {
			case 'GoBack':
				history.back();
				break;
			case 'GoForward':
				history.forward();
				break;
			case 'NextPage':
				this.eventBus.dispatch('nextpage', {});
				break;
			case 'PrevPage':
				this.eventBus.dispatch('previouspage', {});
				break;
			case 'LastPage':
				if (this.pdfViewer) {
					this.goToPage(this.pagesCount);
				}
				break;
			case 'FirstPage':
				this.goToPage(1);
				break;
			case 'Print':
				this.eventBus.dispatch('print', {});
				break;
			default:
				console.warn(`SimpleLinkService: Unknown named action "${action}".`);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	executeSetOCGState(_action: unknown): void {
		// not implemented, optional content is not supported
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	goToXY(pageNumber: number, _x: number, _y: number): void {
		this.goToPage(pageNumber);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setHash(_hash: string): void {
		// not implemented, hash navigation is not supported
	}
}
