<script lang="ts">
	// screenshot carousel; all shots share the same size so the frame never shifts, hover pauses
	import { onMount } from 'svelte';
	import visual from '$lib/assets/showcase/visual-dark.png';
	import source from '$lib/assets/showcase/source-dark.png';
	import diff from '$lib/assets/showcase/diff-dark.png';
	import errorlog from '$lib/assets/showcase/errorlog-dark.png';

	const shots = [
		{ src: visual, label: 'Visual editor, PDF preview, and a real terminal' },
		{ src: source, label: 'The same file in the source editor' },
		{ src: diff, label: 'Side-by-side diff and built-in source control' },
		{ src: errorlog, label: 'Compile errors as a Problems list, with file and line' }
	];

	let active = $state(0);
	let paused = false;

	onMount(() => {
		const timer = setInterval(() => {
			if (!paused) active = (active + 1) % shots.length;
		}, 6000);
		return () => clearInterval(timer);
	});
</script>

<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="border-surface-200 grid overflow-hidden rounded-xl border bg-white shadow-2xl"
		onmouseenter={() => (paused = true)}
		onmouseleave={() => (paused = false)}
	>
		{#each shots as shot, i (shot.label)}
			<img
				src={shot.src}
				alt={shot.label}
				loading={i === 0 ? 'eager' : 'lazy'}
				draggable="false"
				class="col-start-1 row-start-1 block h-auto w-full transition-opacity duration-500 {i === active
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
			/>
		{/each}
	</div>

	<div class="mt-4 flex flex-col items-center gap-2">
		<div class="flex items-center gap-2">
			{#each shots as shot, i (shot.label)}
				<button
					class="h-2.5 w-2.5 rounded-full transition-colors {i === active ? 'bg-surface-500' : 'bg-surface-300 hover:bg-surface-400'}"
					aria-label="Show: {shot.label}"
					aria-current={i === active}
					onclick={() => (active = i)}
				></button>
			{/each}
		</div>
		<p class="text-surface-600 text-sm font-medium" aria-live="polite">{shots[active].label}</p>
	</div>
</div>
