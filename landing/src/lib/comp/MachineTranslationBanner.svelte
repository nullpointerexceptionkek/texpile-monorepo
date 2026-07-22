<script lang="ts">
	import { X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { LOCALE_META } from '$lib/localeMeta';

	const locale = getLocale();
	const meta = LOCALE_META[locale];
	const dismissKey = `texpile:mtBannerDismissed:${locale}`;

	// defaults hidden so the prerendered HTML never flashes it; onMount reveals it if not dismissed yet
	let dismissed = $state(true);
	onMount(() => {
		if (!meta?.machineTranslated) return;
		try {
			dismissed = localStorage.getItem(dismissKey) === '1';
		} catch {
			dismissed = false;
		}
	});

	function dismiss() {
		dismissed = true;
		try {
			localStorage.setItem(dismissKey, '1');
		} catch {
			/* private mode, etc. */
		}
	}

	const reportUrl = `https://github.com/texpile/texpile/issues/new?title=${encodeURIComponent(`Translation issue: ${meta?.label ?? locale}`)}`;
</script>

{#if meta?.machineTranslated && !dismissed}
	<div class="bg-warning-50 border-warning-200 border-b px-4 py-2">
		<div class="mx-auto flex max-w-7xl items-center justify-center gap-3 text-center text-sm">
			<span class="text-warning-900">{m.mt_banner_text()}</span>
			<a href={reportUrl} target="_blank" rel="noopener noreferrer" class="text-warning-900 font-medium underline">
				{m.mt_report_issue()}
			</a>
			<button onclick={dismiss} class="text-warning-700 hover:text-warning-900 shrink-0" aria-label={m.mt_dismiss_aria()}>
				<X class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
