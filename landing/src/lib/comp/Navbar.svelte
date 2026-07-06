<script lang="ts">
	import { Github } from '@lucide/svelte';
	import LogoDark from '$lib/assets/Logo-dark.svg';
	import { onMount } from 'svelte';

	// absolute hrefs so they resolve from any route, not just the home page
	const navLinks = [
		{ href: '/#features', label: 'Features' },
		{ href: '/download', label: 'Download' },
		{ href: '/#faq', label: 'FAQ' }
	];

	let atTop = $state(true);
	onMount(() => {
		const onScroll = () => (atTop = window.scrollY < 30);
		window.addEventListener('scroll', onScroll);
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	});

	// the repo is private during the beta, so the GitHub icon shows a note instead of linking out
	let sourceNote = $state(false);
	let sourceNoteTimer: ReturnType<typeof setTimeout> | undefined;
	function showSourceNote() {
		sourceNote = true;
		clearTimeout(sourceNoteTimer);
		sourceNoteTimer = setTimeout(() => (sourceNote = false), 2500);
	}
</script>

<header
	class="bg-surface-50/95 sticky top-0 z-50 border-b backdrop-blur-sm transition-colors duration-200 {atTop
		? 'border-transparent'
		: 'border-surface-200'}"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<nav class="relative flex h-16 items-center justify-between">
			<a href="/" class="flex items-center">
				<img src={LogoDark} alt="Texpile" class="h-8" />
			</a>

			<div class="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
				{#each navLinks as link (link.href)}
					<a href={link.href} class="text-surface-700 hover:text-primary-600 font-medium transition-colors">
						{link.label}
					</a>
				{/each}
			</div>

			<div class="relative flex items-center">
				<button
					type="button"
					onclick={showSourceNote}
					class="text-surface-600 hover:text-surface-950 flex cursor-pointer items-center transition-colors"
					aria-label="Texpile on GitHub"
				>
					<Github class="h-5 w-5" />
				</button>
				{#if sourceNote}
					<div
						class="border-surface-200 text-surface-700 absolute top-full right-0 mt-3 rounded-lg border bg-white px-3 py-2 text-sm whitespace-nowrap shadow-lg"
						role="status"
					>
						The source will be available on GitHub soon.
					</div>
				{/if}
			</div>
		</nav>
	</div>
</header>
