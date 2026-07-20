<script lang="ts">
	// Floating "session is live" pill; opens the share modal.
	import { m } from '$lib/paraglide/messages';

	let { count, onclick }: { count: number; onclick: () => void } = $props();
</script>

<button
	class="preset-filled-primary-500 fixed right-3 bottom-3 z-1200 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg"
	{onclick}
>
	<span class="size-2 shrink-0 rounded-full bg-white"></span>
	{m.share_active_badge({ count })}
</button>
