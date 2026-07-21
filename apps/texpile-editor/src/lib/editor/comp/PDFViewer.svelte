<script lang="ts">
	// controlled: pass src (a texfile:// URL or bytes); uncontrolled: omit src and it follows pdfStore
	import { PdfViewer, PdfToolbar, PdfRenderer, type PdfSource, type PdfViewerActions } from 'svelte-pdf-view';
	import PdfActionsBridge from './PdfActionsBridge.svelte';
	import { pdfStore } from '$lib/stores/pdfStore';
	import { resolvedMode } from '$lib/theme';
	import { settings } from '$lib/settings';
	import { onMount } from 'svelte';

	interface Props {
		filename?: string;
		src?: string | ArrayBuffer;
		/** SyncTeX inverse search: double-click reports page + position (PDF points) plus the clicked word for anchoring. */
		onPageClick?: (page: number, x: number, y: number, selectText?: string) => void;
	}
	let { filename, src, onPageClick }: Props = $props();

	let actions: PdfViewerActions | null = null;
	/** SyncTeX forward search: scroll to and flash a box. (x, y) is the box origin in PDF points, top-left, y down. */
	export function scrollToPosition(page: number, x: number, y: number, width?: number, height?: number): void {
		actions?.scrollToPosition?.(page, x, y, width, height);
	}

	let pdfSource = $state<PdfSource | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let lastUrl = '';
	// logical document id (path without the &t= cache-bust): unchanged across recompiles so the
	// viewer keeps its scroll, changed when a different PDF opens so it resets to the top
	let docKey = $state<string | undefined>(undefined);
	const docKeyOf = (url: string) => url.replace(/[?&]t=\d+/, '');

	async function fetchPdf(url: string) {
		// keep the current PDF (and its scroll) on screen while a recompile's bytes fetch; only show
		// the blocking "Loading" state on the very first load, when there's nothing to keep
		const firstLoad = pdfSource === null;
		if (firstLoad) loading = true;
		error = null;
		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) throw new Error(`Could not load the PDF (${res.status}).`);
			const buf = await res.arrayBuffer();
			if (buf.byteLength === 0) throw new Error('The PDF is empty.');
			docKey = docKeyOf(url);
			pdfSource = buf;
			lastUrl = url;
		} catch (e) {
			// a recompile's PDF can be caught mid-write (truncated/empty for a beat). On the first
			// load there's nothing to keep, so surface the error; on a reload keep the current PDF up
			// rather than blanking it, which would remount the viewer (loading flash + lost cross-fade).
			// lastUrl stays unchanged so the next poll with a fresh mtime refetches.
			if (firstLoad) {
				error = e instanceof Error ? e.message : 'Could not load the PDF.';
				pdfSource = null;
			}
		} finally {
			loading = false;
		}
	}

	function apply(input: string | ArrayBuffer | null | undefined) {
		if (input instanceof ArrayBuffer) {
			// guest session: each recompile is a fresh buffer but the same logical file
			docKey = filename ?? 'pdf';
			pdfSource = input;
			loading = false;
			error = null;
		} else if (typeof input === 'string') {
			if (input !== lastUrl) fetchPdf(input);
		} else {
			pdfSource = null;
			loading = false;
			error = null;
			lastUrl = '';
			docKey = undefined;
		}
	}

	$effect(() => {
		if (src !== undefined) apply(src);
	});

	// no src given: follow pdfStore
	onMount(() => {
		if (src !== undefined) return;
		return pdfStore.subscribe((data) => apply(data));
	});
</script>

{#if loading && !pdfSource}
	<div class="text-surface-500 flex h-full w-full items-center justify-center text-sm">Loading PDF…</div>
{:else if error}
	<div class="text-error-500 flex h-full w-full items-center justify-center p-4 text-center text-sm">{error}</div>
{:else if pdfSource}
	{@const dark = $resolvedMode === 'dark'}
	<div class="flex h-full w-full flex-col">
		<PdfViewer src={pdfSource} documentKey={docKey} downloadFilename={filename}>
			<PdfToolbar />
			<PdfActionsBridge onActions={(a) => (actions = a)} />
			<!-- darkMode inverts the page canvases; the chrome always follows the app theme via `dark`.
			     Scrollbar matches the app's scrollers: native in light mode, the [data-mode='dark']
			     pill in dark (that global rule can't reach into the shadow DOM). -->
			<PdfRenderer
				{onPageClick}
				darkMode={dark && $settings.pdfDarkPages}
				backgroundColor={dark ? 'var(--color-surface-950, #131316)' : '#f5f5f5'}
				pageShadow={dark ? '0 2px 8px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.4)' : undefined}
				scrollbarThumbColor={dark ? 'var(--color-surface-700, #4a4a52)' : undefined}
				scrollbarTrackColor={dark ? 'transparent' : undefined}
				scrollbarThumbHoverColor={dark ? 'var(--color-surface-600, #5e5e68)' : undefined}
				scrollbarWidth={dark ? '10px' : undefined}
			/>
		</PdfViewer>
	</div>
{:else}
	<div class="text-surface-500 flex h-full w-full items-center justify-center p-4 text-center text-sm">Compile to preview the PDF.</div>
{/if}
