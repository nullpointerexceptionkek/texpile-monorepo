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

	async function fetchPdf(url: string) {
		loading = true;
		error = null;
		try {
			const res = await fetch(url, { cache: 'no-store' });
			if (!res.ok) throw new Error(`Could not load the PDF (${res.status}).`);
			const buf = await res.arrayBuffer();
			if (buf.byteLength === 0) throw new Error('The PDF is empty.');
			pdfSource = buf;
			lastUrl = url;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the PDF.';
			pdfSource = null;
		} finally {
			loading = false;
		}
	}

	function apply(input: string | ArrayBuffer | null | undefined) {
		if (input instanceof ArrayBuffer) {
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

{#if loading}
	<div class="text-surface-500 flex h-full w-full items-center justify-center text-sm">Loading PDF…</div>
{:else if error}
	<div class="text-error-500 flex h-full w-full items-center justify-center p-4 text-center text-sm">{error}</div>
{:else if pdfSource}
	{@const dark = $resolvedMode === 'dark'}
	<div class="flex h-full w-full flex-col">
		<PdfViewer src={pdfSource} downloadFilename={filename}>
			<PdfToolbar />
			<PdfActionsBridge onActions={(a) => (actions = a)} />
			<!-- darkMode inverts the page canvases; the chrome always follows the app theme via `dark` -->
			<PdfRenderer
				{onPageClick}
				darkMode={dark && $settings.pdfDarkPages}
				backgroundColor={dark ? 'var(--color-surface-950, #131316)' : '#f5f5f5'}
				pageShadow={dark ? '0 2px 8px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.4)' : undefined}
				scrollbarThumbColor={dark ? '#4a4a52' : '#888'}
				scrollbarTrackColor={dark ? 'var(--color-surface-900, #1c1d20)' : '#e0e0e0'}
				scrollbarThumbHoverColor={dark ? '#5e5e68' : '#666'}
				scrollbarWidth="8px"
			/>
		</PdfViewer>
	</div>
{:else}
	<div class="text-surface-500 flex h-full w-full items-center justify-center p-4 text-center text-sm">Compile to preview the PDF.</div>
{/if}
