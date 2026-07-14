import { downloadKey } from '$lib/platform';

export interface UpdateInfo {
	version: string;
	/** release notes for the new version, when latest.json carries them */
	notes?: string[];
}

function isNewer(latest: string, current: string): boolean {
	const a = latest.split('.').map(Number);
	const b = current.split('.').map(Number);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const x = a[i] ?? 0;
		const y = b[i] ?? 0;
		if (x !== y) return x > y;
	}
	return false;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
	try {
		const q = new URLSearchParams({ v: __APP_VERSION__, os: downloadKey() });
		const res = await fetch(`https://updates.texpile.com/?${q}`);
		if (!res.ok) return null;
		const latest = (await res.json()) as { version?: string; notes?: string[] };
		if (!latest.version || !isNewer(latest.version, __APP_VERSION__)) return null;
		const notes = Array.isArray(latest.notes) ? latest.notes.filter((n) => typeof n === 'string').slice(0, 10) : undefined;
		return { version: latest.version, notes };
	} catch {
		return null;
	}
}
