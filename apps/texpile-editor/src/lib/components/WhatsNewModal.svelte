<script lang="ts">
	import { X } from '@lucide/svelte';
	import { updateSettings } from '$lib/settings';
	import demoVideo from '$lib/assets/live-preview-demo.mp4';

	type Entry = { version: string; notes: string[] };
	let { open = $bindable(false), entry, onClose }: { open: boolean; entry: Entry; onClose?: () => void } = $props();

	function close() {
		open = false;
		updateSettings({ whatsNewSeen: entry.version });
		onClose?.();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && close()}
	>
		<div class="card bg-surface-50-950 border-surface-300-700 w-full max-w-2xl border p-5 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold">What's new in Texpile v{entry.version}</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label="Close">
					<X class="size-4" />
				</button>
			</div>
			<video src={demoVideo} class="border-surface-300-700 mb-4 w-full rounded border" autoplay loop muted playsinline></video>
			<ul class="text-surface-600-300 mb-4 list-disc space-y-1 pl-5 text-sm">
				{#each entry.notes as note (note)}
					<li>{note}</li>
				{/each}
			</ul>
			<div class="flex justify-end">
				<button class="btn btn-sm preset-filled-primary-500" onclick={close}>Got it</button>
			</div>
		</div>
	</div>
{/if}
