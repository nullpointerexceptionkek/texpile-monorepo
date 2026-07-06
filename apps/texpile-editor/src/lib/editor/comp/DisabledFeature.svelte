<script lang="ts">
	import { Tooltip, Portal } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		enabled: boolean;
		tooltip?: string;
		children: Snippet;
	}

	let { enabled, tooltip = 'This feature is not enabled for this template', children }: Props = $props();

	let tooltipOpen = $state(false);
</script>

{#if enabled}
	{@render children()}
{:else}
	<Tooltip open={tooltipOpen} onOpenChange={(e) => (tooltipOpen = e.open)} positioning={{ placement: 'top' }} openDelay={300}>
		<Tooltip.Trigger class="w-full">
			<div class="disabled-feature">
				{@render children()}
			</div>
		</Tooltip.Trigger>
		<Portal>
			<Tooltip.Positioner class="z-floating-ui">
				<Tooltip.Content class="card preset-filled p-2 text-sm">
					{tooltip}
				</Tooltip.Content>
			</Tooltip.Positioner>
		</Portal>
	</Tooltip>
{/if}

<style>
	.disabled-feature {
		opacity: 0.4;
		pointer-events: none;
		cursor: not-allowed;
	}
</style>
