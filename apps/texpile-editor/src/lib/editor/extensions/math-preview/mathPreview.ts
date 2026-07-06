// source-mode live math preview: a tooltip above the cursor typesets the math region on every
// keystroke, rendered with mathlive so it matches what visual mode will show.
import { EditorView, showTooltip, type Tooltip, type TooltipView } from '@codemirror/view';
import { StateField, type EditorState, type Extension } from '@codemirror/state';
import { convertLatexToMarkup } from 'mathlive';
import 'mathlive/static.css';
import 'mathlive/fonts.css';
import { findMathRegions, mathRegionAt, type MathRegion } from './mathScanner';

/** above this the preview silently disables instead of re-scanning megabytes per keystroke. */
const MAX_SCAN_LENGTH = 2_000_000;

const regionsField = StateField.define<MathRegion[]>({
	create: (state) => scan(state),
	update: (value, tr) => (tr.docChanged ? scan(tr.state) : value)
});

function scan(state: EditorState): MathRegion[] {
	if (state.doc.length > MAX_SCAN_LENGTH) return [];
	return findMathRegions(state.doc.toString());
}

function activeRegion(state: EditorState): MathRegion | null {
	const sel = state.selection.main;
	if (!sel.empty) return null;
	const region = mathRegionAt(state.field(regionsField), sel.head);
	if (!region) return null;
	// nothing to render yet, the user just typed the opening delimiter
	if (!state.sliceDoc(region.innerFrom, region.innerTo).trim()) return null;
	return region;
}

function previewLatex(state: EditorState, region: MathRegion): string {
	let latex: string;
	if (region.env) {
		// environments affect layout (align columns, gather centering), so keep \begin…\end;
		// synthesize the \end while the user is still typing it
		latex = state.sliceDoc(region.from, region.to);
		if (region.unclosed) latex += `\\end{${region.env}}`;
	} else {
		latex = state.sliceDoc(region.innerFrom, region.innerTo);
	}
	// \label / \tag are cross-referencing noise the preview can't resolve, drop them
	return latex.replace(/\\(?:label|tag)\s*\{[^}]*\}/g, '');
}

function render(dom: HTMLElement, state: EditorState): void {
	const region = activeRegion(state);
	if (!region) return; // the tooltip is being removed this update anyway
	try {
		dom.innerHTML = convertLatexToMarkup(previewLatex(state, region), {
			defaultMode: region.kind === 'display' ? 'math' : 'inline-math'
		});
	} catch {
		// mathlive rejects some mid-edit input outright, keep the last good render on screen
	}
}

// module-level so every tooltip shares one `create` identity: that's what makes CodeMirror
// reuse the DOM across updates instead of recreating it per keystroke
function createPreview(view: EditorView): TooltipView {
	const dom = document.createElement('div');
	dom.className = 'cm-math-preview';
	dom.setAttribute('aria-hidden', 'true');
	render(dom, view.state);
	return {
		dom,
		offset: { x: 0, y: 6 },
		update(update) {
			if (update.docChanged || update.selectionSet) render(dom, update.state);
		}
	};
}

const tooltipField = StateField.define<Tooltip | null>({
	create: (state) => tooltipFor(state),
	update(value, tr) {
		if (!tr.docChanged && !tr.selection) return value;
		return tooltipFor(tr.state);
	},
	provide: (f) => showTooltip.from(f)
});

function tooltipFor(state: EditorState): Tooltip | null {
	if (!activeRegion(state)) return null;
	return { pos: state.selection.main.head, above: true, create: createPreview };
}

const previewTheme = EditorView.baseTheme({
	'.cm-tooltip.cm-math-preview': {
		padding: '0.4rem 0.7rem',
		borderRadius: '0.5rem',
		maxWidth: 'min(36rem, 90vw)',
		maxHeight: '40vh',
		overflow: 'hidden',
		fontSize: '1.05rem',
		// glanceable only: clicks pass through to the code beneath and focus never leaves the editor
		pointerEvents: 'none'
	}
});

/** live typeset preview of the math region under the cursor. latex source mode only. */
export function mathPreview(): Extension {
	return [regionsField, tooltipField, previewTheme];
}
