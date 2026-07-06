// light/dark/system appearance. the resolved mode lands as data-mode + a .dark class on <html>;
// an inline script in app.html mirrors the resolve logic pre-paint to avoid a flash.
import { writable } from 'svelte/store';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'texpile:mode';

function stored(): ThemeChoice {
	if (typeof localStorage === 'undefined') return 'system';
	const v = localStorage.getItem(KEY);
	return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function systemPrefersDark(): boolean {
	return (
		typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
	);
}

function resolve(choice: ThemeChoice): 'light' | 'dark' {
	return choice === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : choice;
}

/** the mode actually rendered (light/dark) after resolving "system". */
export const resolvedMode = writable<'light' | 'dark'>('light');

function apply(resolved: 'light' | 'dark'): void {
	resolvedMode.set(resolved);
	if (typeof document === 'undefined') return;
	document.documentElement.setAttribute('data-mode', resolved);
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/** the user's choice (light/dark/system), what the Preferences control binds to. */
export const themeChoice = writable<ThemeChoice>(stored());

let mql: MediaQueryList | null = null;
function watchSystem(choice: ThemeChoice): void {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
	mql ??= window.matchMedia('(prefers-color-scheme: dark)');
	mql.onchange = choice === 'system' ? () => apply(resolve('system')) : null;
}

export function setTheme(choice: ThemeChoice): void {
	themeChoice.set(choice);
	try {
		localStorage.setItem(KEY, choice);
	} catch {
		/* ignore (private mode, etc.) */
	}
	apply(resolve(choice));
	watchSystem(choice);
}

// apply on module load; app.html's inline script already handled the very first paint
if (typeof document !== 'undefined') {
	const choice = stored();
	apply(resolve(choice));
	watchSystem(choice);
}
