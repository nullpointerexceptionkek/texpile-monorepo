<!-- renders a keyboard shortcut with the right symbols per OS: Mod+Shift+M becomes ⌘⇧M on mac, Ctrl+Shift+M on win/linux -->
<script lang="ts">
	import { isMac } from '$lib/platform';

	interface Props {
		/** shortcut string using "Mod" for Cmd/Ctrl, e.g. "Mod+Shift+M". */
		keys: string;
		class?: string;
	}

	let { keys, class: className = '' }: Props = $props();

	const macSymbols: Record<string, string> = {
		mod: '⌘',
		ctrl: '⌃',
		alt: '⌥',
		shift: '⇧',
		enter: '↵',
		return: '↵',
		backspace: '⌫',
		delete: '⌦',
		escape: '⎋',
		esc: '⎋',
		tab: '⇥',
		space: '␣',
		up: '↑',
		down: '↓',
		left: '←',
		right: '→'
	};

	const winLabels: Record<string, string> = {
		mod: 'Ctrl',
		ctrl: 'Ctrl',
		alt: 'Alt',
		shift: 'Shift',
		enter: 'Enter',
		return: 'Enter',
		backspace: 'Backspace',
		delete: 'Del',
		escape: 'Esc',
		esc: 'Esc',
		tab: 'Tab',
		space: 'Space',
		up: '↑',
		down: '↓',
		left: '←',
		right: '→'
	};

	function formatShortcut(shortcut: string): { keys: string[]; separator: string } {
		const parts = shortcut.split('+').map((part) => part.trim().toLowerCase());

		const formattedKeys = parts.map((part) => {
			if (isMac) {
				return macSymbols[part] ?? part.toUpperCase();
			} else {
				return winLabels[part] ?? part.toUpperCase();
			}
		});

		return {
			keys: formattedKeys,
			separator: isMac ? '' : '+'
		};
	}

	const formatted = $derived(formatShortcut(keys));
</script>

<kbd class="kbd-shortcut {className}" class:mac={isMac}>
	{#if isMac}
		{#each formatted.keys as key}
			<span class="key">{key}</span>
		{/each}
	{:else}
		{#each formatted.keys as key, i}
			<span class="key">{key}</span>{#if i < formatted.keys.length - 1}<span class="separator">+</span>{/if}
		{/each}
	{/if}
</kbd>

<style lang="postcss">
	.kbd-shortcut {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.75rem;
		color: var(--color-surface-500);
		white-space: nowrap;
	}

	.kbd-shortcut.mac {
		gap: 0;
	}

	.kbd-shortcut .key {
		display: inline-flex;
		align-items: center;
	}

	.separator {
		margin: 0 0.05rem;
	}
</style>
