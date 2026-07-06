import { mount } from 'svelte';
import './app.css';
import '$lib/theme'; // side-effect: applies the saved appearance and watches OS changes
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

const app = mount(App, { target: document.getElementById('app')! });

export default app;
