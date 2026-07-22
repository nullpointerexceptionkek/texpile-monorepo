<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	let dismissed = $state(false);
	let mounted = $state(false);

	onMount(() => {
		try {
			dismissed = localStorage.getItem('mobileBannerClosed') === 'true';
		} catch {
			// localStorage may be unavailable (e.g. private browsing); banner just stays visible
		}
		mounted = true;
	});

	function close() {
		dismissed = true;
		try {
			localStorage.setItem('mobileBannerClosed', 'true');
		} catch {
			// localStorage may be unavailable (e.g. private browsing); dismissal just won't persist
		}
	}
</script>

{#if mounted && !dismissed}
	<div class="md:hidden">
		<div class="mx-auto max-w-screen-lg px-4 py-2">
			<div class="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-amber-500">
					<path
						fill-rule="evenodd"
						d="M10.29 3.86a1.5 1.5 0 0 1 2.42 0l8.47 12.7c.66.99-.05 2.31-1.21 2.31H3.03c-1.16 0-1.87-1.32-1.21-2.31l8.47-12.7ZM12 9a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0v-4.5A.75.75 0 0 0 12 9Zm0 8a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
						clip-rule="evenodd"
					/>
				</svg>
				<p class="text-sm leading-5">{m.mobilebanner_limited_support()}</p>
				<button class="ml-auto text-amber-600 hover:text-amber-800" aria-label={m.mobilebanner_dismiss_aria()} onclick={close}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	@reference "../../app.css";
</style>
