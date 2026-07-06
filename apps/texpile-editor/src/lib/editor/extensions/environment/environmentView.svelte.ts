// NodeView for the environment block: header form above the editable body. header edits
// update node.attrs, which the serializer rebuilds \begin{name}<args> from, so edits round-trip.
import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { mount, unmount } from 'svelte';
import EnvironmentComponent from './EnvironmentComponent.svelte';

export default function environmentView(node: Node, view: EditorView, getPos: () => number | undefined): NodeView {
	let currentNode = node;

	const dom = document.createElement('div');
	dom.className = 'tex-environment';
	dom.setAttribute('data-env', String(node.attrs.name ?? 'environment'));

	// non-editable so PM doesn't treat the header as content
	const header = document.createElement('div');
	header.contentEditable = 'false';
	dom.appendChild(header);

	const contentDOM = document.createElement('div');
	contentDOM.className = 'tex-environment-body';
	dom.appendChild(contentDOM);

	const updateAttrs = (attrs: Record<string, unknown>) => {
		const pos = getPos();
		if (pos === undefined) return;
		view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, ...attrs }));
	};

	const props = $state({ node: currentNode, updateAttrs });
	const component = mount(EnvironmentComponent, { target: header, props });

	return {
		dom,
		contentDOM,
		update(newNode) {
			if (newNode.type !== currentNode.type) return false;
			currentNode = newNode;
			props.node = newNode;
			dom.setAttribute('data-env', String(newNode.attrs.name ?? 'environment'));
			return true;
		},
		// ignore mutations inside the svelte header, PM owns the body
		ignoreMutation(mutation) {
			return header.contains(mutation.target as HTMLElement) || mutation.target === header;
		},
		stopEvent(event) {
			const t = event.target;
			return t instanceof HTMLElement && header.contains(t);
		},
		destroy() {
			unmount(component);
		}
	};
}
