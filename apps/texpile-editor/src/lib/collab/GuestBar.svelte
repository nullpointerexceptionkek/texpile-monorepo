<script lang="ts">
	// The guest session's top bar: connection status, who's here, request a compile, leave. Shown
	// in place of the host menu bar when WorkspaceView runs over a shared session, so it matches
	// that bar's geometry and presence cluster rather than looking like a separate chrome.
	import { navigate } from '$lib/router.svelte';
	import { collabGuest } from '$lib/collab/guestStore.svelte';
	import { toaster } from '$lib/modals/toaster-svelte';
	import { m } from '$lib/paraglide/messages';
	import { Users, LogOut, Play, PanelRight } from '@lucide/svelte';

	let { onTogglePdf }: { onTogglePdf: () => void } = $props();

	const online = $derived(collabGuest.status === 'online' && collabGuest.hostOnline);
	const statusText = $derived(
		!collabGuest.hostOnline
			? m.session_host_gone()
			: collabGuest.status === 'online'
				? m.session_status_online()
				: m.session_status_reconnecting()
	);

	function requestCompile() {
		collabGuest.requestCompile();
		toaster.info({ title: m.session_compile_requested(), duration: 2500 });
	}
	function leave() {
		collabGuest.leave();
		navigate('/');
	}

	const btnClass = 'rounded-base flex items-center gap-1.5 px-2.5 py-1 text-sm hover:preset-tonal';
</script>

<nav class="border-surface-200-800 flex items-center gap-0.5 border-b px-2 py-0.5">
	<span class="flex items-center gap-2 px-1.5 py-1">
		<span class="{online ? 'bg-success-500' : 'bg-warning-500'} size-2 shrink-0 rounded-full"></span>
		<span class="text-sm font-medium">{m.session_collaborating()}</span>
		<span class="text-surface-500 text-xs">{statusText}</span>
	</span>

	<div class="ml-auto flex items-center gap-0.5">
		{#if collabGuest.peers.length}
			<span class="mr-1 flex items-center gap-1.5" title={collabGuest.peers.map((p) => p.name).join(', ')}>
				<Users class="text-surface-500 size-4" />
				<span class="flex items-center -space-x-1.5">
					{#each collabGuest.peers.slice(0, 5) as peer, i (i)}
						<span
							class="border-surface-100-900 flex size-5 items-center justify-center rounded-full border text-[10px] font-bold text-white"
							style="background-color: {peer.color}"
							title={peer.name}>{(peer.name || '?').slice(0, 1).toUpperCase()}</span
						>
					{/each}
				</span>
			</span>
		{/if}
		<button class={btnClass} onclick={requestCompile} title={m.session_request_compile()}>
			<Play class="size-4" />
			{m.session_request_compile()}
		</button>
		<button class={btnClass} onclick={onTogglePdf} title={m.session_pdf_tab()} aria-label={m.session_pdf_tab()}>
			<PanelRight class="size-4" />
		</button>
		<button class="{btnClass} text-error-600-400" onclick={leave}>
			<LogOut class="size-4" />
			{m.session_leave()}
		</button>
	</div>
</nav>
