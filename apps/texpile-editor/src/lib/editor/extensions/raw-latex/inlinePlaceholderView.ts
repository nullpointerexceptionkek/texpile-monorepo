import { NodeSelection } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';

/** resolved display value for inline commands with nothing to edit (just \today for now).
 *  the node keeps its verbatim text, so the .tex still round-trips unchanged. */
export function inlinePlaceholder(text: string): string | null {
	const t = text.trim();
	if (t === '\\today') return formatToday();
	return null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** matches latex's default \today (english article class): "Month D, YYYY". */
function formatToday(): string {
	const d = new Date();
	return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export class InlinePlaceholderView implements NodeView {
	dom: HTMLElement;
	private view: EditorView;
	private getPos: () => number;

	constructor(node: Node, view: EditorView, getPos: () => number) {
		this.view = view;
		this.getPos = getPos;

		const el = document.createElement('span');
		el.className = 'latex-placeholder-inline';
		el.setAttribute('contenteditable', 'false');
		el.title = node.textContent.trim(); // hover shows the underlying command
		el.textContent = inlinePlaceholder(node.textContent) ?? '';
		// click selects the whole node (so backspace removes it) rather than editing the rendered value
		el.addEventListener('mousedown', (e) => {
			e.preventDefault();
			const pos = this.getPos();
			if (pos != null) this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos)));
		});
		this.dom = el;
	}

	update(node: Node): boolean {
		if (!inlinePlaceholder(node.textContent)) return false; // no longer a known inline command
		this.dom.textContent = inlinePlaceholder(node.textContent) ?? '';
		this.dom.title = node.textContent.trim();
		return true;
	}
	selectNode() {
		this.dom.classList.add('latex-placeholder-selected');
	}
	deselectNode() {
		this.dom.classList.remove('latex-placeholder-selected');
	}
	stopEvent() {
		return false;
	}
	ignoreMutation() {
		return true;
	}
}
