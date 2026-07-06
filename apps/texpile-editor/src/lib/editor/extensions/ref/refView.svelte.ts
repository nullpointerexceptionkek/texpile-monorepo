import type { EditorView, NodeView } from 'prosemirror-view';
import type { Node as PMNode } from 'prosemirror-model';
import { mount, unmount } from 'svelte';
import RefDisplay from './RefDisplay.svelte';

export default class RefView implements NodeView {
	dom: HTMLElement;
	private svelteComponent: ReturnType<typeof mount>;
	private componentProps = $state<{
		node: PMNode;
		view: EditorView;
		updateTrigger: number;
	}>();
	node: PMNode;
	private view: EditorView;

	constructor(node: PMNode, view: EditorView) {
		this.node = node;
		this.view = view;

		this.dom = document.createElement('span');
		this.dom.className = 'inline-block';

		this.componentProps = {
			node: this.node,
			view: this.view,
			updateTrigger: 0
		};

		this.svelteComponent = mount(RefDisplay, {
			target: this.dom,
			props: this.componentProps
		});
	}

	update(node: PMNode) {
		if (node.type !== this.node.type) {
			return false;
		}

		this.node = node;

		if (this.componentProps) {
			this.componentProps.node = node;
			this.componentProps.updateTrigger++;
		}

		return true;
	}

	stopEvent() {
		return true; // the svelte component handles its own events
	}

	destroy() {
		if (this.svelteComponent) {
			unmount(this.svelteComponent);
		}
	}
}
