export interface ChangelogEntry {
	version: string;
	date?: string;
	notes: string[];
}

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

// bounds the empty-marker view as releases accumulate; old sections age out newest-first
const MAX_SHOWN = 8;

/** releases the user hasn't seen, oldest first (the modal renders them in order). `all` arrives
 *  newest-first from the changelog. An empty `seen` means a fresh install or an upgrade from
 *  before the marker existed (pre-0.13.0): both get everything since the changelog epoch, so the
 *  0.13.0 live-mode showcase reaches everyone exactly once. */
export function unseenEntries(all: ChangelogEntry[], seen: string): ChangelogEntry[] {
	const picked = seen ? all.filter((e) => isNewer(e.version, seen)) : all;
	return picked.slice(0, MAX_SHOWN).reverse();
}
