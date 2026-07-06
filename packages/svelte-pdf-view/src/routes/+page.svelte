<script lang="ts">
	import { base } from '$app/paths';
	import { PdfViewer, PdfToolbar, PdfRenderer, type PdfSource } from '$lib/index.js';

	const defaultPdf = `${base}/Demo.pdf`;
	let pdfSource: PdfSource = $state(defaultPdf);
	let sourceType = $state<'url' | 'arraybuffer' | 'uint8array' | 'blob'>('url');
	let loadError = $state<string | null>(null);

	function resetToDefault() {
		pdfSource = defaultPdf;
		sourceType = 'url';
		loadError = null;
	}

	async function rotateSourceType() {
		loadError = null;
		const types: Array<'url' | 'arraybuffer' | 'uint8array' | 'blob'> = ['url', 'arraybuffer', 'uint8array', 'blob'];
		const currentIndex = types.indexOf(sourceType);
		const nextType = types[(currentIndex + 1) % types.length];

		try {
			const response = await fetch(defaultPdf);
			const arrayBuffer = await response.arrayBuffer();

			switch (nextType) {
				case 'url':
					pdfSource = defaultPdf;
					break;
				case 'arraybuffer':
					pdfSource = arrayBuffer;
					break;
				case 'uint8array':
					pdfSource = new Uint8Array(arrayBuffer);
					break;
				case 'blob':
					pdfSource = new Blob([arrayBuffer], { type: 'application/pdf' });
					break;
			}
			sourceType = nextType;
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to convert PDF';
		}
	}

	async function loadInvalidPdf() {
		loadError = null;
		pdfSource = 'https://invalid-url-that-does-not-exist.com/fake.pdf';
		sourceType = 'url';
	}

	function handlePdfError(error: string) {
		console.error('PDF Error (from callback):', error);
		loadError = `Callback received: ${error}`;
	}
</script>

<div class="demo">
	<h1>PDF Viewer Demo</h1>

	<div class="controls">
		<div class="url-input">
			<label for="pdf-url">PDF URL:</label>
			<input
				id="pdf-url"
				type="text"
				value={typeof pdfSource === 'string' ? pdfSource : `[${sourceType}]`}
				oninput={(e) => {
					pdfSource = e.currentTarget.value;
					sourceType = 'url';
				}}
				placeholder="Enter PDF URL..."
			/>
		</div>
		<div class="buttons">
			<button onclick={resetToDefault}>Reset</button>
			<button onclick={rotateSourceType}>
				Rotate Source Type (current: {sourceType})
			</button>
			<button onclick={loadInvalidPdf} class="error-btn">Test Error Handling</button>
		</div>
		{#if loadError}
			<div class="local-error">Local Error: {loadError}</div>
		{/if}
	</div>

	<div class="viewer-container">
		<PdfViewer src={pdfSource} onerror={handlePdfError}>
			<PdfToolbar />
			<PdfRenderer backgroundColor="#e8e8e8" scrollbarThumbColor="#c1c1c1" scrollbarTrackColor="#f1f1f1" />
		</PdfViewer>
	</div>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		height: 100vh;
		padding: 1rem;
		box-sizing: border-box;
	}

	h1 {
		margin: 0 0 1rem 0;
	}

	.controls {
		margin-bottom: 1rem;
	}

	.url-input {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.url-input input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.buttons button {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #f5f5f5;
		cursor: pointer;
	}

	.buttons button:hover {
		background: #e5e5e5;
	}

	.error-btn {
		background: #fee2e2 !important;
		border-color: #fca5a5 !important;
	}

	.error-btn:hover {
		background: #fecaca !important;
	}

	.local-error {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: #fee2e2;
		border: 1px solid #fca5a5;
		border-radius: 4px;
		color: #b91c1c;
	}

	.viewer-container {
		flex: 1;
		min-height: 0;
		border: 1px solid #ccc;
		border-radius: 4px;
		overflow: hidden;
	}
</style>
