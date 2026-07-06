// hover tooltips: macro/command signature, package/class blurb, citation detail, and a plain-text
// preview of a \ref/\label target's defining line. Lighter than LaTeX Workshop's equivalent (no
// isolated MathJax worker process, no PDF/graphics thumbnail) — text and the existing mathlive
// renderer (already used by math-preview.ts) cover the common cases.
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import { get } from 'svelte/store';
import type { Extension } from '@codemirror/state';
import { convertLatexToMarkup } from 'mathlive';
import { referenceStore } from '$lib/stores/editorStore';
import { CLASS_NAMES } from './data/classnames';
import { PACKAGE_NAMES } from './data/packagenames';
import { macroLookup } from './completion/macros';

const CLASS_DETAIL = new Map(CLASS_NAMES.map((c) => [c.name, c.detail]));
const PACKAGE_DETAIL = new Map(PACKAGE_NAMES.map((p) => [p.name, p.detail]));

export interface Token {
	kind: 'macro' | 'package' | 'class' | 'citekey' | 'label';
	value: string;
	from: number;
	to: number;
}

/** finds what the given position is "over" by pattern-matching within its line. shared with definition.ts. */
export function tokenAt(lineText: string, lineStart: number, pos: number): Token | null {
	const posInLine = pos - lineStart;

	// \macroname — longest run of letters immediately after a backslash containing pos
	for (const m of lineText.matchAll(/\\([a-zA-Z]+)/g)) {
		const from = lineStart + (m.index ?? 0);
		const to = from + m[0].length;
		if (posInLine >= (m.index ?? 0) && pos <= to) return { kind: 'macro', value: m[1], from, to };
	}

	const bracedFamilies: { re: RegExp; kind: Token['kind'] }[] = [
		{ re: /\\(?:usepackage|RequirePackage)(?:\[[^\]]*\])?\{([^{}]+)\}/g, kind: 'package' },
		{ re: /\\documentclass(?:\[[^\]]*\])?\{([^{}]+)\}/g, kind: 'class' },
		{ re: /\\[a-zA-Z]*[Cc]ite[a-zA-Z]*\*?(?:\[[^\]]*\])*\{([^{}]+)\}/g, kind: 'citekey' },
		{ re: /\\(?:ref|eqref|pageref|autoref|nameref|cref|Cref|vref|Vref)\*?\{([^{}]+)\}/g, kind: 'label' }
	];
	for (const { re, kind } of bracedFamilies) {
		for (const m of lineText.matchAll(re)) {
			const groupStart = lineStart + (m.index ?? 0) + m[0].indexOf(m[1]);
			const groupEnd = groupStart + m[1].length;
			if (pos < groupStart || pos > groupEnd) continue;
			// a package/citation list can have multiple comma-separated names; find which one
			const offsetInGroup = pos - groupStart;
			const parts = m[1].split(',');
			let consumed = 0;
			for (const part of parts) {
				const partFrom = groupStart + consumed;
				const partTo = partFrom + part.length;
				if (offsetInGroup >= consumed && pos <= partTo) return { kind, value: part.trim(), from: partFrom, to: partTo };
				consumed += part.length + 1;
			}
		}
	}
	return null;
}

function dom(html: string): HTMLElement {
	const div = document.createElement('div');
	div.className = 'cm-tooltip-latex-hover';
	div.innerHTML = html;
	return div;
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** the buffer offset of \label{name}'s definition, or null if not found. shared with definition.ts. */
export function findLabelOffset(fullText: string, name: string): number | null {
	const re = new RegExp(`\\\\label\\{${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`);
	const idx = fullText.search(re);
	return idx < 0 ? null : idx;
}

function labelContext(fullText: string, name: string): string | null {
	const idx = findLabelOffset(fullText, name);
	if (idx == null) return null;
	const lineNo = fullText.slice(0, idx).split('\n').length - 1;
	const lines = fullText.split('\n');
	return lines.slice(Math.max(0, lineNo - 1), lineNo + 2).join('\n');
}

/** hover tooltip provider for macros, packages/classes, citations, and \ref targets. */
export function latexHover(): Extension {
	return hoverTooltip((view, pos): Tooltip | null => {
		const line = view.state.doc.lineAt(pos);
		const token = tokenAt(line.text, line.from, pos);
		if (!token) return null;

		if (token.kind === 'macro') {
			const found = macroLookup(view.state.doc.toString(), token.value);
			if (!found) return null; // unrecognized macro: no hover, matching LaTeX Workshop
			const shape = found.detail ?? '';
			return {
				pos: token.from,
				end: token.to,
				above: true,
				create: () => ({ dom: dom(`<code>\\${escapeHtml(token.value)}${escapeHtml(shape)}</code>`) })
			};
		}
		if (token.kind === 'package' || token.kind === 'class') {
			const map = token.kind === 'package' ? PACKAGE_DETAIL : CLASS_DETAIL;
			const detail = map.get(token.value);
			if (!detail) return null;
			return {
				pos: token.from,
				end: token.to,
				above: true,
				create: () => ({ dom: dom(`<b>${escapeHtml(token.value)}</b><br>${escapeHtml(detail)}`) })
			};
		}
		if (token.kind === 'citekey') {
			const refs = get(referenceStore) ?? [];
			const ref = refs.find((r) => r.key === token.value);
			if (!ref) return null;
			const parts = [ref.title, ref.author].filter(Boolean).map(String);
			if (!parts.length) return null;
			return { pos: token.from, end: token.to, above: true, create: () => ({ dom: dom(escapeHtml(parts.join(' — '))) }) };
		}
		if (token.kind === 'label') {
			const context = labelContext(view.state.doc.toString(), token.value);
			if (!context) return null;
			// render as math if the context looks like it's inside a display-math environment;
			// otherwise show the raw source line — a lighter equivalent of LaTeX Workshop's
			// hover-rendered equation preview (see module doc comment for what's cut here)
			const looksMath = /\\begin\{(align|equation|gather|multline)\*?\}/.test(context);
			if (looksMath) {
				try {
					return {
						pos: token.from,
						end: token.to,
						above: true,
						create: () => ({ dom: dom(convertLatexToMarkup(context, { defaultMode: 'math' })) })
					};
				} catch {
					/* fall through to plain text */
				}
			}
			return { pos: token.from, end: token.to, above: true, create: () => ({ dom: dom(`<pre>${escapeHtml(context)}</pre>`) }) };
		}
		return null;
	});
}
