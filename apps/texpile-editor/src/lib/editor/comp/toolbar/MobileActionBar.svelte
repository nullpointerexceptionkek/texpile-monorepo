<script lang="ts">
	import { preventDefault } from 'svelte/legacy';
	import { templateFeaturesStore } from '$lib/stores/editorStore';
	import { BookOpen, Settings, FileText } from '@lucide/svelte';
	import DisabledFeature from '../DisabledFeature.svelte';
	import { isReadOnly } from '$lib/stores/permissionStore';

	let citationsEnabled = $derived($templateFeaturesStore?.citations ?? true);

	function emit(name: string) {
		window.dispatchEvent(new CustomEvent(name));
	}
</script>

<div class="z-sticky-header border-surface-200 bg-surface-50-950/95 fixed bottom-0 left-0 right-0 border-t backdrop-blur-sm md:hidden">
	<div
		class="mx-auto grid max-w-screen-sm items-center gap-2 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
		class:grid-cols-3={!$isReadOnly}
		class:grid-cols-2={$isReadOnly}
	>
		<DisabledFeature enabled={citationsEnabled}>
			<button
				class="btn btn-sm preset-tonal-surface flex h-12 flex-col items-center gap-1 text-xs"
				onclick={preventDefault(() => emit('open-citations'))}
				aria-label="Citations"
			>
				<BookOpen class="size-5" />
				<span>Citations</span>
			</button>
		</DisabledFeature>

		{#if !$isReadOnly}
			<button
				class="btn btn-sm preset-tonal-surface flex h-12 flex-col items-center gap-1 text-xs"
				onclick={preventDefault(() => emit('open-settings'))}
				aria-label="Settings"
				data-tour="mobile-settings-button"
			>
				<Settings class="size-5" />
				<span>Settings</span>
			</button>
		{/if}

		<button
			class="btn btn-sm preset-tonal-surface flex h-12 flex-col items-center gap-1 text-xs"
			onclick={preventDefault(() => emit('open-export'))}
			aria-label="Export"
			data-tour="mobile-export-button"
		>
			<FileText class="size-5" />
			<span>Export</span>
		</button>
	</div>
</div>
