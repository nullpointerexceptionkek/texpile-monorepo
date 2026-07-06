// cursor placement at doc edges: the page padding lives outside view.dom, so PM never sees
// clicks there. we listen on the wrapper and drop the cursor at the doc start/end instead.
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const boundaryClickPluginKey = new PluginKey('boundary-click');

function insertEdgeParagraph(view: EditorView, atStart: boolean): void {
	const { state } = view;
	const para = state.schema.nodes.paragraph?.create();
	if (!para) return;
	const at = atStart ? 0 : state.doc.content.size;
	const tr = state.tr.insert(at, para);
	tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1), atStart ? 1 : -1)).scrollIntoView();
	view.dispatch(tr);
}

function placeCursorAtEdge(view: EditorView, atStart: boolean): void {
	const { doc } = view.state;
	const pos = atStart ? 1 : doc.content.size - 1;
	view.dispatch(view.state.tr.setSelection(TextSelection.near(doc.resolve(pos), atStart ? 1 : -1)).scrollIntoView());
}

/** inserts a paragraph at the edge, or reuses an empty one already there. */
function handleEdge(view: EditorView, atStart: boolean): void {
	const edge = atStart ? view.state.doc.firstChild : view.state.doc.lastChild;
	if (!edge) return;
	if (edge.type.name === 'paragraph' && edge.content.size === 0) placeCursorAtEdge(view, atStart);
	else insertEdgeParagraph(view, atStart);
	view.focus();
}

class BoundaryClickView {
	private view: EditorView;
	private wrapper: HTMLElement | null;
	private column: Element | null;

	constructor(view: EditorView) {
		this.view = view;
		// listen on the padding wrapper, never document: menus portal to <body>, so this
		// listener only sees clicks inside the editor column
		this.column = view.dom.closest('.texpile-main-editor');
		this.wrapper = (this.column?.parentElement as HTMLElement) ?? null;
		this.wrapper?.addEventListener('mousedown', this.onMouseDown);
	}

	private onMouseDown = (event: MouseEvent) => {
		const { view } = this;
		if (!view.editable) return;
		const main = view.dom.parentElement; // the <main> wrapping the editable
		if (!main) return;
		// only when the padding itself is clicked, not any content child
		if (event.target !== this.wrapper && event.target !== this.column) return;
		const rect = main.getBoundingClientRect();
		if (event.clientY < rect.top) {
			event.preventDefault();
			handleEdge(view, true);
		} else if (event.clientY > rect.bottom) {
			event.preventDefault();
			handleEdge(view, false);
		}
	};

	destroy() {
		this.wrapper?.removeEventListener('mousedown', this.onMouseDown);
	}
}

export function createBoundaryClickPlugin() {
	return new Plugin({
		key: boundaryClickPluginKey,
		view: (view) => new BoundaryClickView(view)
	});
}
