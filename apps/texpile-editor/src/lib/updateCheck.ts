// startup update check against the dl.texpile.com R2 feed (CORS-open, no auth, cached 5min).
// Silent on any failure - this is a courtesy notice, not a feature the user is waiting on.
export interface UpdateInfo {
	version: string;
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
		const res = await fetch('https://dl.texpile.com/latest.json');
		if (!res.ok) return null;
		const latest = (await res.json()) as { version?: string };
		if (!latest.version || !isNewer(latest.version, __APP_VERSION__)) return null;
		return { version: latest.version };
	} catch {
		return null;
	}
}
