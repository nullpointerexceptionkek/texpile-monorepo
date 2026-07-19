<script lang="ts">
	import { X, Download, RefreshCw, ExternalLink } from '@lucide/svelte';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import { settings, updateSettings } from '$lib/settings';
	import { updateState, updateModalOpen, startDownload, installNow } from '$lib/updates';
	import { m } from '$lib/paraglide/messages';

	const u = $derived($updateState);
	const pkexec = $derived(u.installMode === 'package-manager');
	const title = $derived(
		u.phase === 'downloading'
			? m.updatemodal_title_downloading()
			: u.phase === 'downloaded'
				? m.updatemodal_title_downloaded()
				: u.phase === 'error'
					? m.updatemodal_title_error()
					: m.updatemodal_title_available()
	);

	function close() {
		updateModalOpen.set(false);
	}
	function openDownloadPage() {
		close();
		window.open('https://texpile.com/download', '_blank', 'noopener,noreferrer');
	}
	function mb(n: number): string {
		return (n / 1048576).toFixed(1);
	}
</script>

<svelte:window onkeydown={(e) => $updateModalOpen && e.key === 'Escape' && close()} />

{#if $updateModalOpen && u.phase !== 'idle'}
	<div
		class="fixed inset-0 z-1300 flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		onmousedown={(e) => e.target === e.currentTarget && close()}
	>
		<!-- max-h + a scrolling notes list: the buttons stay reachable on any window size -->
		<div class="card bg-surface-50-950 border-surface-300-700 flex max-h-full w-full max-w-md flex-col border p-5 shadow-2xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-base font-semibold">
					<Download class="text-primary-500 size-5" />
					{title}
				</h2>
				<button class="btn-icon btn-icon-sm hover:preset-tonal" onclick={close} aria-label={m.updatemodal_close_aria()}>
					<X class="size-4" />
				</button>
			</div>

			{#if u.phase === 'available'}
				<p class="text-surface-600-300 mb-4 text-sm">{m.updatemodal_version_available({ version: u.version })}</p>
				{#if u.notes?.length}
					<ul class="text-surface-600-300 mb-4 min-h-0 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
						{#each u.notes as note (note)}
							<li>{note}</li>
						{/each}
					</ul>
				{/if}
				<div class="mb-4 flex items-center justify-between gap-4">
					<span class="text-sm">{m.updatemodal_check_updates_on_launch()}</span>
					<Switch checked={$settings.checkForUpdates} onCheckedChange={(d) => updateSettings({ checkForUpdates: d.checked })}>
						<Switch.Control><Switch.Thumb /></Switch.Control>
						<Switch.HiddenInput />
					</Switch>
				</div>
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.updatemodal_dismiss()}</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={() => startDownload()}>
						<Download class="size-4" />
						{m.updatemodal_download_update()}
					</button>
				</div>
			{:else if u.phase === 'downloading'}
				<div class="bg-surface-200-800 mb-2 h-2 w-full overflow-hidden rounded-full">
					<div class="bg-primary-500 h-full rounded-full transition-[width] duration-300" style="width: {Math.max(2, u.percent)}%"></div>
				</div>
				<p class="text-surface-600-300 mb-4 text-sm">
					{#if u.total > 0}
						{m.updatemodal_progress_percent({
							percent: Math.round(u.percent),
							transferred: mb(u.transferred),
							total: mb(u.total)
						})}
					{:else}
						{m.updatemodal_starting_download()}
					{/if}
				</p>
				<p class="text-surface-500 mb-4 text-sm">{m.updatemodal_background_download_notice()}</p>
				<div class="flex justify-end">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.updatemodal_hide()}</button>
				</div>
			{:else if u.phase === 'downloaded'}
				{#if pkexec}
					<p class="text-surface-600-300 mb-4 text-sm">
						{m.updatemodal_downloaded_pkexec({ version: u.version })}
					</p>
					<div class="flex justify-end gap-2">
						<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.updatemodal_later()}</button>
						<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={installNow}>
							<RefreshCw class="size-4" />
							{m.updatemodal_install_now()}
						</button>
					</div>
				{:else}
					<p class="text-surface-600-300 mb-4 text-sm">{m.updatemodal_downloaded_ready({ version: u.version })}</p>
					<div class="flex justify-end gap-2">
						<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.updatemodal_later()}</button>
						<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={installNow}>
							<RefreshCw class="size-4" />
							{m.updatemodal_restart_and_install()}
						</button>
					</div>
				{/if}
			{:else if u.phase === 'error'}
				<p class="text-surface-600-300 mb-4 text-sm">
					{m.updatemodal_download_error()}
				</p>
				{#if u.error}
					<p class="text-surface-500 mb-4 text-xs break-words">{u.error}</p>
				{/if}
				<div class="flex justify-end gap-2">
					<button class="btn btn-sm hover:preset-tonal" onclick={close}>{m.updatemodal_close()}</button>
					<button class="btn btn-sm preset-filled-primary-500 gap-1.5" onclick={openDownloadPage}>
						<ExternalLink class="size-4" />
						{m.updatemodal_open_download_page()}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
