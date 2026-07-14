import { browser } from '$lib/runtime';

function detectMac(): boolean {
	if (!browser || typeof navigator === 'undefined') return false;
	const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
	if (uaData?.platform) return /mac/i.test(uaData.platform);
	if (navigator.platform) return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	return /Mac/i.test(navigator.userAgent);
}

export const isMac = detectMac();

export const modLabel = isMac ? '⌘' : 'Ctrl';

export function modKey(...rest: string[]): string {
	return [modLabel, ...rest].join('+');
}

export function downloadKey(): 'mac' | 'linux' | 'windows' {
	if (isMac) return 'mac';
	if (browser && /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)) return 'linux';
	return 'windows';
}
