import { writable } from 'svelte/store';

// counter bumped to make every ref display recalculate
export const refUpdateTrigger = writable(0);

export function triggerRefUpdate() {
	refUpdateTrigger.update((n) => n + 1);
}
