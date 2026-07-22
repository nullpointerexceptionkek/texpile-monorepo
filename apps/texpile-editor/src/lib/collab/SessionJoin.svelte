<script lang="ts">
	// The join screen for a shared session: enter the code, or the goodbye screen after it ends.
	// Once joined, App swaps to WorkspaceView (guest mode) — this only covers the not-yet-editing states.
	import { navigate } from '$lib/router.svelte';
	import { collabGuest } from '$lib/collab/guestStore.svelte';
	import { isValidShareCode } from '$lib/collab/e2e/shareCode';
	import { settings, updateSettings, DEFAULT_COLLAB_RELAY_URL } from '$lib/settings';
	import { m } from '$lib/paraglide/messages';
	import { RotateCcw, ShieldCheck, ChevronDown } from '@lucide/svelte';

	let codeInput = $state('');
	let nameInput = $state(loadName());
	let relayDraft = $state($settings.collabRelayUrl);
	let relayTouched = $state(false);
	let advancedOpen = $state(false);
	$effect(() => {
		const url = $settings.collabRelayUrl;
		// reveal the relay field unprompted only when it isn't the default one
		if (!relayTouched) {
			relayDraft = url;
			advancedOpen = url.trim().replace(/\/+$/, '') !== DEFAULT_COLLAB_RELAY_URL;
		}
	});

	function loadName(): string {
		try {
			return localStorage.getItem('texpile:collabName') || '';
		} catch {
			return '';
		}
	}

	async function join() {
		const trimmedRelay = relayDraft.trim();
		if (trimmedRelay && trimmedRelay !== $settings.collabRelayUrl) updateSettings({ collabRelayUrl: trimmedRelay });
		try {
			localStorage.setItem('texpile:collabName', nameInput.trim());
		} catch {
			/* private mode */
		}
		await collabGuest.join(codeInput, nameInput);
	}

	function backHome() {
		collabGuest.reset();
		navigate('/');
	}

	const joinDisabled = $derived(collabGuest.status === 'joining' || !isValidShareCode(codeInput) || !nameInput.trim());
	// trailing slashes are stripped by the transport, so treat them as the same address here too
	const relayIsDefault = $derived(relayDraft.trim().replace(/\/+$/, '') === DEFAULT_COLLAB_RELAY_URL);

	function resetRelay() {
		relayDraft = DEFAULT_COLLAB_RELAY_URL;
		relayTouched = true;
	}

	function errorText(err: string): string {
		if (err === 'invalid-code') return m.session_error_invalid_code();
		if (err === 'no-session') return m.session_error_no_session();
		if (err === 'session-full') return m.session_error_full();
		return m.session_error_generic({ message: err });
	}
</script>

{#if collabGuest.status === 'ended'}
	<div class="bg-surface-50-950 flex min-h-screen items-center justify-center p-6">
		<div class="card bg-surface-50-950 border-surface-300-700 w-full max-w-md border p-6 text-center shadow-2xl">
			<h1 class="mb-2 text-xl font-semibold">{m.session_ended_title()}</h1>
			<p class="text-surface-600-300 mb-5 text-sm">
				{collabGuest.endedReason === 'host-ended' ? m.session_ended_host() : m.session_ended_error()}
			</p>
			<button class="btn preset-filled-primary-500" onclick={backHome}>{m.session_back_home()}</button>
		</div>
	</div>
{:else}
	<div class="bg-surface-50-950 flex min-h-screen items-center justify-center p-6">
		<div class="card bg-surface-50-950 border-surface-300-700 w-full max-w-md border p-6 shadow-2xl">
			<h1 class="mb-1 text-xl font-semibold">{m.session_join_title()}</h1>
			<p class="text-surface-600-300 mb-5 text-sm">{m.session_join_desc()}</p>
			<label class="mb-3 block">
				<span class="mb-1 block text-sm font-medium">{m.session_code_label()}</span>
				<input
					class="input w-full font-mono tracking-wide uppercase"
					placeholder="ABCDE-FGHJK-MNPQR-STVWX-YZ234-5"
					bind:value={codeInput}
					onkeydown={(e) => e.key === 'Enter' && !joinDisabled && join()}
				/>
			</label>
			<label class="mb-3 block">
				<span class="mb-1 block text-sm font-medium">{m.session_name_label()}</span>
				<input class="input w-full" maxlength={40} bind:value={nameInput} onkeydown={(e) => e.key === 'Enter' && !joinDisabled && join()} />
			</label>
			{#if collabGuest.joinError}
				<p class="text-error-600-400 mb-3 text-sm">{errorText(collabGuest.joinError)}</p>
			{/if}

			<!-- plumbing almost nobody changes: collapsed unless they're already on a custom relay -->
			<button
				type="button"
				class="text-surface-500 hover:text-surface-950-50 inline-flex items-center gap-1 text-xs"
				onclick={() => (advancedOpen = !advancedOpen)}
			>
				<ChevronDown class="size-3.5 transition-transform {advancedOpen ? '' : '-rotate-90'}" />
				{m.session_relay_label()}
			</button>
			{#if advancedOpen}
				<div class="mt-2 flex gap-2">
					<input class="input flex-1 text-sm" bind:value={relayDraft} oninput={() => (relayTouched = true)} />
					<button
						type="button"
						class="btn-icon btn-icon-sm hover:preset-tonal shrink-0"
						onclick={resetRelay}
						disabled={relayIsDefault}
						title={m.collab_relay_reset_title()}
						aria-label={m.collab_relay_reset()}
					>
						<RotateCcw class="size-4" />
					</button>
				</div>
			{/if}

			<p class="text-surface-500 border-surface-200-800 mt-4 flex items-start gap-1.5 border-t pt-3 text-xs">
				<ShieldCheck class="text-success-600-400 mt-px size-3.5 shrink-0" />
				<span>{m.collab_e2ee_note()}</span>
			</p>

			<div class="mt-4 flex justify-end gap-2">
				<button class="btn preset-tonal" onclick={() => navigate('/')}>{m.session_cancel()}</button>
				<button class="btn preset-filled-primary-500" disabled={joinDisabled} onclick={join}>
					{collabGuest.status === 'joining' ? m.session_joining() : m.session_join_button()}
				</button>
			</div>
		</div>
	</div>
{/if}
