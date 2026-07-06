<script lang="ts">
	import { navigate } from '$lib/router.svelte';
	import { ArrowLeft } from '@lucide/svelte';

	interface Props {
		status?: number;
		message?: string;
	}

	let { status = 404, message = '' }: Props = $props();

	const title = $derived(status === 404 ? 'Page not found' : 'Something went wrong');

	function goBack() {
		if (window.history.length > 1) window.history.back();
		else navigate('/');
	}
</script>

<svelte:head>
	<title>{status} · {title}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-6">
	<div class="flex max-w-sm flex-col items-center gap-4 text-center">
		<p class="text-surface-400-600 font-mono text-4xl font-semibold">{status}</p>
		<h1 class="text-lg font-medium">{title}</h1>
		{#if message && message !== title}
			<p class="text-surface-500 text-sm">{message}</p>
		{/if}
		<button class="btn preset-filled-primary-500 mt-2 gap-2" onclick={goBack}>
			<ArrowLeft size={16} />
			Go back
		</button>
	</div>
</div>
