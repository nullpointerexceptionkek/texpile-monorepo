// prefers userAgentData.platform, falls back to the deprecated APIs for older Chromium/Electron
import { browser } from '$lib/runtime';

function detectMac(): boolean {
	if (!browser || typeof navigator === 'undefined') return false;
	const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
	if (uaData?.platform) return /mac/i.test(uaData.platform);
	if (navigator.platform) return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	return /Mac/i.test(navigator.userAgent);
}

/** true on macOS (and iPad/iPhone). */
export const isMac = detectMac();

export const modLabel = isMac ? '⌘' : 'Ctrl';

/** shortcut label for this OS, modKey('Shift', 'F') -> "⌘+Shift+F" or "Ctrl+Shift+F". */
export function modKey(...rest: string[]): string {
	return [modLabel, ...rest].join('+');
}

/** dl.texpile.com/latest/<key> stable-download-link suffix for this OS. */
export function downloadKey(): 'mac' | 'linux' | 'windows' {
	if (isMac) return 'mac';
	if (browser && /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)) return 'linux';
	return 'windows';
}
