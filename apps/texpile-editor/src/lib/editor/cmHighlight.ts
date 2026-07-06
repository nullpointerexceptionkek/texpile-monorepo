// CodeMirror's defaultHighlightStyle is tuned for a white background, so dark mode gets a
// brightened same-hue variant, swapped via a Compartment when the resolved mode changes.
import { Compartment, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
import { get } from 'svelte/store';
import { resolvedMode } from '$lib/theme';

function parseHex(c: string): { r: number; g: number; b: number } | null {
	const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
	if (!m) return null;
	let h = m[1];
	if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
	}
	return { h, s, l };
}

/** lighten a token color so it reads on the dark surface, keeping its hue. */
function brighten(color: string): string {
	const rgb = parseHex(color);
	if (!rgb) return color; // non-hex (named/hsl), leave as-is
	const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
	const sat = Math.min(Math.max(s, 0.4), 0.85);
	return `hsl(${Math.round(h)} ${Math.round(sat * 100)}% 72%)`;
}

const darkHighlightStyle = HighlightStyle.define(
	defaultHighlightStyle.specs.map((spec) => {
		const color = (spec as { color?: string }).color;
		return color ? { ...spec, color: brighten(color) } : spec;
	})
);

const compartment = new Compartment();
const styleFor = (mode: 'light' | 'dark'): Extension => syntaxHighlighting(mode === 'dark' ? darkHighlightStyle : defaultHighlightStyle);

// editors that opt in register here; a mode change reconfigures all of them
const views = new Set<EditorView>();
const tracker = ViewPlugin.define((view) => {
	views.add(view);
	return { destroy: () => views.delete(view) };
});
resolvedMode.subscribe((mode) => {
	for (const v of views) v.dispatch({ effects: compartment.reconfigure(styleFor(mode)) });
});

/** syntax highlighting that follows the app's light/dark mode; use instead of syntaxHighlighting(defaultHighlightStyle). */
export function cmSyntaxHighlight(): Extension {
	return [compartment.of(styleFor(get(resolvedMode))), tracker];
}
