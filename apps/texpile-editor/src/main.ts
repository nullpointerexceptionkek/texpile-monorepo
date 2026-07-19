import { mount } from 'svelte';
import './app.css';
import '$lib/theme'; // side-effect: applies the saved appearance and watches OS changes
import { loadSettings } from '$lib/settings';
import App from './App.svelte';

// console.log is silenced unless window.texpile.debug (settable from DevTools)
window.texpile = window.texpile || { debug: import.meta.env.DEV };
const originalLog = console.log;
console.log = (...args: unknown[]) => {
	if (window.texpile?.debug) {
		originalLog.apply(console, args);
	}
};

// some pre-bundler libraries probe a Node-style `global`
(window as unknown as { global: Window }).global = window;

window.addEventListener('error', (e) => console.error('[client error]', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => console.error('[client error]', e.reason));

// wait for the persisted uiLocale before the first render, so a non-English user never sees a
// flash of English UI (settings.ts applies the locale as soon as this resolves). top-level await
// isn't available at this app's build target, hence the .then() instead of an await here.
loadSettings().then(() => {
	mount(App, { target: document.getElementById('app')! });
});
