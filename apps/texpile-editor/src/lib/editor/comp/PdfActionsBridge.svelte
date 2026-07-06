<script lang="ts">
	// must live inside <PdfViewer> to read the viewer context; hands the actions proxy
	// back to the parent so the app can drive SyncTeX forward search
	import { onMount } from 'svelte';
	import { getPdfViewerContext, type PdfViewerActions } from 'svelte-pdf-view';

	let { onActions }: { onActions: (a: PdfViewerActions) => void } = $props();
	const ctx = getPdfViewerContext();
	onMount(() => onActions(ctx.actions));
</script>
