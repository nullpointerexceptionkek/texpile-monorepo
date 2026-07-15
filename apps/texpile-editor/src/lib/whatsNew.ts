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

/** releases the user hasn't seen, oldest first (the modal renders them in order). `all` arrives
 *  newest-first from the changelog. A fresh install (no `seen`) gets only the newest entry, never
 *  the whole history. */
export function unseenEntries(all: ChangelogEntry[], seen: string): ChangelogEntry[] {
	if (!all.length) return [];
	const picked = seen ? all.filter((e) => isNewer(e.version, seen)) : all.slice(0, 1);
	return picked.reverse();
}
