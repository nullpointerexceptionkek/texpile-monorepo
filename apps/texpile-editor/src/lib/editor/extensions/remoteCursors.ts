// Remote collaborator presence in the visual editor: caret bar + name label, selection tint,
// and a block edge-mark on the block a peer's caret sits in. Positions arrive pre-mapped to PM
// coordinates (WorkspaceView runs the awareness -> sourceMap chain); this plugin only renders.
// Every element is layout-inert: zero-width in-flow anchors with out-of-flow bars, tint via
// background, block mark via inset box-shadow, so a peer's cursor can never move a glyph.
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as PMNode } from 'prosemirror-model';
import './remoteCursors.css';

export interface RemotePeerSel {
	clientId: number;
	name: string;
	color: string;
	/** PM positions, already clamped-mapped by the caller. */
	anchor: number;
	head: number;
	/** the top-level block containing head, for the edge-mark. */
	blockFrom?: number;
	blockTo?: number;
}

export const remoteCursorsKey = new PluginKey<DecorationSet>('remote-cursors');

function caretDom(name: string, color: string): HTMLElement {
	const span = document.createElement('span');
	span.className = 'pm-remote-caret';
	span.style.setProperty('--peer-color', color);
	span.appendChild(document.createTextNode('⁠')); // zero-width content gives the bar line height
	const label = document.createElement('span');
	label.className = 'pm-remote-caret-label';
	label.textContent = name;
	span.appendChild(label);
	return span;
}

function build(doc: PMNode, peers: RemotePeerSel[]): DecorationSet {
	const decos: Decoration[] = [];
	const max = doc.content.size;
	const clamp = (n: number) => Math.min(Math.max(0, n), max);
	for (const p of peers) {
		const anchor = clamp(p.anchor);
		const head = clamp(p.head);
		if (anchor !== head) {
			decos.push(
				Decoration.inline(Math.min(anchor, head), Math.max(anchor, head), {
					class: 'pm-remote-sel',
					style: `background-color: ${p.color}33`
				})
			);
		}
		decos.push(
			Decoration.widget(head, () => caretDom(p.name, p.color), {
				key: `caret:${p.clientId}:${p.color}:${p.name}`,
				side: 0,
				ignoreSelection: true
			})
		);
		if (p.blockFrom != null && p.blockTo != null && p.blockTo <= max) {
			decos.push(
				Decoration.node(p.blockFrom, p.blockTo, {
					class: 'pm-remote-block',
					style: `--peer-color: ${p.color}`
				})
			);
		}
	}
	return DecorationSet.create(doc, decos);
}

/** replace the rendered peer set (empty array clears). */
export function setRemoteCursors(view: EditorView, peers: RemotePeerSel[]): void {
	view.dispatch(view.state.tr.setMeta(remoteCursorsKey, peers).setMeta('addToHistory', false));
}

export const remoteCursorsPlugin = new Plugin<DecorationSet>({
	key: remoteCursorsKey,
	state: {
		init: () => DecorationSet.empty,
		apply(tr, set) {
			const peers = tr.getMeta(remoteCursorsKey) as RemotePeerSel[] | undefined;
			if (peers) return build(tr.doc, peers);
			// between updates, ride along with document changes
			return tr.docChanged ? set.map(tr.mapping, tr.doc) : set;
		}
	},
	props: {
		decorations(state) {
			return remoteCursorsKey.getState(state);
		}
	}
});
