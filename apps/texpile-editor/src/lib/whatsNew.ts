import { derived, writable } from 'svelte/store';
import { settings } from '$lib/settings';

export interface ChangelogEntry {
	version: string;
	date?: string;
	notes: string[];
}

/** open signal for the panel; set from the Help menu and the start screen. */
export const whatsNewOpen = writable(false);

/** drives the unread dot on the Help menu and the start screen row. */
export const hasUnseenWhatsNew = derived(settings, ($s) => unseenEntries(__WHATS_NEW__, $s.whatsNewSeen).length > 0);

function isNewer(a: string, b: string): boolean {
	const x = a.split('.').map(Number);
	const y = b.split('.').map(Number);
	for (let i = 0; i < Math.max(x.length, y.length); i++) {
		const p = x[i] ?? 0;
		const q = y[i] ?? 0;
		if (p !== q) return p > q;
	}
	return false;
}

// bounds an upgrade that skipped many releases; the newest sections win
const MAX_SHOWN = 8;

function sameMinor(a: string, b: string): boolean {
	const x = a.split('.');
	const y = b.split('.');
	return x[0] === y[0] && x[1] === y[1];
}

/** releases the user hasn't seen, oldest first (the modal renders them in order). `all` arrives
 *  newest-first from the changelog. An empty `seen` means a fresh install or an upgrade from
 *  before the marker existed (pre-0.13.0): both get the current minor series (0.13.x while 0.13
 *  is current), so each minor's showcase reaches everyone once and retires at the next minor. */
export function unseenEntries(all: ChangelogEntry[], seen: string): ChangelogEntry[] {
	if (!all.length) return [];
	const picked = seen
		? all.filter((e) => isNewer(e.version, seen)).slice(0, MAX_SHOWN)
		: all.filter((e) => sameMinor(e.version, all[0].version));
	return picked.reverse();
}

/** what to show when the panel is opened deliberately: the unseen releases if there are any,
 *  otherwise the current minor series, so it is never empty just because you're up to date. */
export function entriesToShow(all: ChangelogEntry[], seen: string): ChangelogEntry[] {
	if (!all.length) return [];
	const unseen = unseenEntries(all, seen);
	return unseen.length ? unseen : all.filter((e) => sameMinor(e.version, all[0].version)).reverse();
}
