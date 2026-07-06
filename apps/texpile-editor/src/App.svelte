<script lang="ts">
	import { onMount } from 'svelte';
	import { route, navigate } from '$lib/router.svelte';
	import { native, scanTexFiles, dirname } from '$lib/workspace/fileSystem';
	import { workspaceRoot, texFiles, activeFilePath, addRecentFolder } from '$lib/workspace/workspaceStore';
	import { updateSettings } from '$lib/settings';

	import StartView from './views/StartView.svelte';
	import WorkspaceView from './views/WorkspaceView.svelte';
	import ErrorView from './views/ErrorView.svelte';

	// OS "Open With" hands us a .tex via the main process; open its folder and activate the file
	onMount(() => {
		const n = native();
		if (!n?.onOpenPath) return;
		return n.onOpenPath(async (filePath) => {
			try {
				const root = dirname(filePath);
				const { files } = await scanTexFiles(root);
				const match = files.find((f) => f.path === filePath || f.path.toLowerCase() === filePath.toLowerCase());
				workspaceRoot.set(root);
				texFiles.set(files);
				activeFilePath.set(match?.path ?? filePath);
				addRecentFolder(root);
				updateSettings({ lastFolder: root });
				navigate('/workspace');
			} catch {
				/* ignore an OS open we can't honor */
			}
		});
	});

	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/modals/toaster-svelte';

	import MobileSupportBanner from '$lib/components/MobileSupportBanner.svelte';
</script>

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast {toast}>
			<Toast.Message>
				<Toast.Title>{toast.title}</Toast.Title>
				<Toast.Description>{toast.description}</Toast.Description>
			</Toast.Message>
			<Toast.CloseTrigger />
		</Toast>
	{/snippet}
</Toast.Group>

<div class="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex flex-col">
	<div class="pointer-events-auto">
		<MobileSupportBanner />
	</div>
</div>

{#if route.path === '/'}
	<StartView />
{:else if route.path === '/workspace'}
	<WorkspaceView />
{:else}
	<ErrorView status={404} />
{/if}

<noscript>
	<div class="fixed inset-x-0 bottom-0 border-t-4 border-red-500 bg-gray-100 p-4 text-red-700" role="alert">
		<h1 class="mb-2 text-xl font-bold">JavaScript Required</h1>
		<p>This website requires JavaScript to function properly. Please enable JavaScript in your browser settings.</p>
	</div>
</noscript>

<style>
	/* toasts default to transparent, give them a solid surface */
	:global([data-scope='toast'][data-part='root']) {
		background-color: var(--color-surface-50, #ffffff);
		border: 1px solid var(--color-surface-300, #cbd5e1);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.22);
	}
	:global(.dark [data-scope='toast'][data-part='root']) {
		background-color: var(--color-surface-950, #0b1220);
		border-color: var(--color-surface-700, #334155);
	}
	/* explicit text colors, the defaults were too low-contrast on the surface */
	:global([data-scope='toast'][data-part='title']) {
		color: var(--color-surface-950, #0b1220);
		font-weight: 600;
	}
	:global([data-scope='toast'][data-part='description']) {
		color: var(--color-surface-700, #334155);
	}
	:global(.dark [data-scope='toast'][data-part='title']) {
		color: var(--color-surface-50, #f8fafc);
	}
	:global(.dark [data-scope='toast'][data-part='description']) {
		color: var(--color-surface-200, #e2e8f0);
	}
	/* colored left border so success/error/warning read as typed cards */
	:global([data-scope='toast'][data-part='root'][data-type='success']) {
		border-inline-start: 3px solid var(--color-success-500);
	}
	:global([data-scope='toast'][data-part='root'][data-type='error']) {
		border-inline-start: 3px solid var(--color-error-500);
	}
	:global([data-scope='toast'][data-part='root'][data-type='warning']) {
		border-inline-start: 3px solid var(--color-warning-500);
	}
	/* neutralize the close button, Skeleton tints it by type by default */
	:global([data-scope='toast'][data-part='close-trigger']) {
		color: var(--color-surface-500) !important;
	}
</style>
