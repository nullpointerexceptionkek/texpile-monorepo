<script lang="ts">
	import { X } from '@lucide/svelte';
	import { updateSettings } from '$lib/settings';
	import demoVideo from '$lib/assets/live-preview-demo.mp4';
	import type { ChangelogEntry } from '$lib/whatsNew';

	// oldest first; the last one is what the user is now on
	let { open = $bindable(false), entries, onClose }: { open: boolean; entries: ChangelogEntry[]; onClose?: () => void } = $props();

	// a demo clip belongs to the release that introduced the feature, so it only plays for someone
	// who hasn't seen that release yet
	const VIDEOS: Record<string, string> = { '0.13.0': demoVideo };

	const newest = $derived(entries[entries.length - 1]);
	const video = $derived(entries.map((e) => VIDEOS[e.version]).find(Boolean));

	function close() {
		open = false;
		if (newest) updateSettings({ whatsNewSeen: newest.version });
		onClose?.();
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open && newest}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && close()}
	>
		<!-- max-h + scrolling middle: header and Got it stay reachable however long the notes run -->
		<div class="card bg-surface-50-950 border-surface-300-700 flex max-h-full w-full max-w-2xl flex-col border p-5 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold">What's new in Texpile v{newest.version}</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label="Close">
					<X class="size-4" />
				</button>
			</div>
			<div class="mb-4 min-h-0 overflow-y-auto">
				{#if video}
					<video src={video} class="border-surface-300-700 mb-4 w-full rounded border" autoplay loop muted playsinline></video>
				{/if}
				<div class="space-y-3">
					{#each entries as entry (entry.version)}
						<div>
							{#if entries.length > 1}
								<div class="text-surface-500 mb-1 text-xs font-semibold">v{entry.version}</div>
							{/if}
							<ul class="text-surface-600-300 list-disc space-y-1 pl-5 text-sm">
								{#each entry.notes as note (note)}
									<li>{note}</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
			<div class="flex justify-end">
				<button class="btn btn-sm preset-filled-primary-500" onclick={close}>Got it</button>
			</div>
		</div>
	</div>
{/if}
