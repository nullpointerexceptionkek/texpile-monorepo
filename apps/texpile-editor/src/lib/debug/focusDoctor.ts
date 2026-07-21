// One-shot diagnosis for the "caret vanished and I can't type" reports: run
// window.texpileFocusDoctor() in DevTools at the moment it happens and paste the output.
// It answers the two questions that distinguish the likely causes: WHO holds focus (a thief
// re-stealing it), and WHAT sits on top of the editor (an invisible click-eating overlay).

import { get } from 'svelte/store';
import { editorViewStore, sourceCmView } from '$lib/stores/editorStore';

function describe(el: Element | null): string {
	if (!el) return '(none)';
	const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '';
	const z = el instanceof HTMLElement ? getComputedStyle(el).zIndex : '';
	return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}${z && z !== 'auto' ? ` (z:${z})` : ''}`;
}

function ancestry(el: Element | null, depth = 5): string[] {
	const out: string[] = [];
	for (let e = el; e && e !== document.body && out.length < depth; e = e.parentElement) out.push(describe(e));
	return out;
}

export function focusDoctor(): Record<string, unknown> {
	const pm = get(editorViewStore);
	const cm = get(sourceCmView);
	const editorDom = cm?.dom.isConnected ? cm.dom : (pm?.dom ?? null);

	// what a click in the middle of the editor would actually hit, top of stack first
	let underEditor: string[] = [];
	if (editorDom) {
		const r = editorDom.getBoundingClientRect();
		const x = Math.max(1, Math.min(window.innerWidth - 2, r.left + r.width / 2));
		const y = Math.max(1, Math.min(window.innerHeight - 2, r.top + Math.min(r.height / 2, 200)));
		underEditor = document.elementsFromPoint(x, y).slice(0, 6).map(describe);
	}

	// anything fixed, near-viewport-sized, and click-eating: the invisible-overlay suspects
	const overlays = Array.from(document.querySelectorAll<HTMLElement>('body *'))
		.filter((el) => {
			const s = getComputedStyle(el);
			if (s.position !== 'fixed' || s.pointerEvents === 'none' || s.display === 'none' || s.visibility === 'hidden') return false;
			const b = el.getBoundingClientRect();
			return b.width >= window.innerWidth * 0.9 && b.height >= window.innerHeight * 0.9;
		})
		.map(describe);

	const report = {
		activeElement: describe(document.activeElement),
		activeAncestry: ancestry(document.activeElement),
		hasDocFocus: document.hasFocus(),
		pm: pm
			? {
					hasFocus: pm.hasFocus(),
					editable: pm.editable,
					selection: `${pm.state.selection.from}-${pm.state.selection.to}`,
					destroyed: pm.isDestroyed
				}
			: null,
		cm: cm ? { hasFocus: cm.hasFocus, readOnly: cm.state.readOnly, connected: cm.dom.isConnected } : null,
		underEditorCenter: underEditor,
		fullScreenOverlays: overlays
	};
	// console.info: main.ts only gates console.log behind the debug flag
	console.info('[focus-doctor]', JSON.stringify(report, null, 2));
	return report;
}
