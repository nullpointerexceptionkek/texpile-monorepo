import { Plugin } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import { tocStore, type TocItem } from './tocStore';

function collectHeadings(doc: Node): TocItem[] {
	const items: TocItem[] = [];
	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			items.push({ level: Number(node.attrs.level ?? 1), text: node.textContent, pos });
		}
	});
	return items;
}

/** Keeps `tocStore` in sync with the document's headings (for the right-rail table of contents). */
export function createTocPlugin() {
	return new Plugin({
		state: {
			init(_, state) {
				tocStore.set(collectHeadings(state.doc));
				return null;
			},
			apply(tr) {
				if (tr.docChanged) tocStore.set(collectHeadings(tr.doc));
				return null;
			}
		}
	});
}
