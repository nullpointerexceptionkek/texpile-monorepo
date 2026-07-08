<script lang="ts">
	import { X, Download } from '@lucide/svelte';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import { settings, updateSettings } from '$lib/settings';

	let { open = $bindable(false), version }: { open: boolean; version: string } = $props();

	function close() {
		open = false;
	}
	function viewDownloadPage() {
		close();
		window.open('https://desktop.texpile.com/download', '_blank', 'noopener,noreferrer');
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && close()}
	>
		<div class="card bg-surface-50-950 border-surface-300-700 w-full max-w-md border p-5 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-base font-semibold">
					<Download class="text-primary-500 size-5" /> Update available
				</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label="Close">
					<X class="size-4" />
				</button>
			</div>
			<p class="text-surface-600-300 mb-4 text-sm">Texpile v{version} is available.</p>
			<div class="mb-4 flex items-center justify-between gap-4">
				<span class="text-sm">Check for updates on launch</span>
				<Switch checked={$settings.checkForUpdates} onCheckedChange={(d) => updateSettings({ checkForUpdates: d.checked })}>
					<Switch.Control><Switch.Thumb /></Switch.Control>
					<Switch.HiddenInput />
				</Switch>
			</div>
			<div class="flex justify-end gap-2">
				<button class="btn btn-sm hover:preset-tonal" onclick={close}>Dismiss</button>
				<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={viewDownloadPage}>
					<Download class="size-4" /> View download page
				</button>
			</div>
		</div>
	</div>
{/if}
