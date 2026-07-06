import { BROWSER } from 'esm-env';

let pdfjsLib: typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null = null;
let pdfWorker: import('pdfjs-dist/legacy/build/pdf.mjs').PDFWorker | null = null;
let rawWorker: Worker | null = null;
let initPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null> | null = null;

/** the PDF.js library instance; creates the worker on first call, cached afterwards. */
export async function getPdfJs(): Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null> {
	if (!BROWSER) return null;

	if (pdfjsLib && pdfWorker) return pdfjsLib;

	if (initPromise) return initPromise;

	initPromise = (async () => {
		pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

		// import.meta.url so bundlers resolve the worker file correctly
		rawWorker = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url), {
			type: 'module'
		});
		pdfWorker = new pdfjsLib.PDFWorker({
			port: rawWorker as unknown as null
		});
		pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker.port;

		return pdfjsLib;
	})();

	return initPromise;
}

/** destroys the PDF.js worker; the next getPdfJs() call creates a new one. */
export function destroyPdfJs(): void {
	if (pdfWorker) {
		pdfWorker.destroy();
		pdfWorker = null;
	}
	if (rawWorker) {
		rawWorker.terminate();
		rawWorker = null;
	}
	pdfjsLib = null;
	initPromise = null;
}
