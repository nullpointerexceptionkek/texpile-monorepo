// Apply the saved appearance before paint so there's no flash (see src/lib/theme.ts).
// Choice is light | dark | system (default); "system" follows the OS preference.
// External (not inline) so the packaged app's CSP can keep script-src 'self' with no inline allowance.
try {
	var c = localStorage.getItem('texpile:mode');
	var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	var dark = c === 'dark' || ((c === 'system' || !c) && sysDark);
	document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
	if (dark) document.documentElement.classList.add('dark');
} catch {
	/* no localStorage / matchMedia: fall back to the default light theme */
}
