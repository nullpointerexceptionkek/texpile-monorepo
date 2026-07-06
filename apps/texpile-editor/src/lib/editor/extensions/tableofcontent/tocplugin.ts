import { NodeSelection, Plugin } from 'prosemirror-state';
import { editorViewStore } from '$lib/stores/editorStore';
import { get } from 'svelte/store';

function createTableOfContents(doc, maxLength = 50, maxWidth = 220) {
	const headings = [];

	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			headings.push({
				level: node.attrs.level,
				text: node.textContent,
				pos
			});
		}
	});

	if (headings.length === 0) {
		const noSections = document.createElement('p');
		noSections.textContent = 'No sections found';
		noSections.className = 'text-gray-500 italic';
		return noSections;
	}

	const toc = document.createElement('div');
	toc.className = 'table-of-contents space-y-2';

	headings.forEach((heading) => {
		const headingElement = document.createElement(`h${heading.level}`);
		headingElement.className = `toc-level-${heading.level} text-gray-700 font-medium w-[${maxWidth}px] truncate`;

		const displayText = heading.text.length > maxLength ? `${heading.text.slice(0, maxLength)}...` : heading.text;

		const link = document.createElement('a');
		link.href = `#heading-${heading.pos}`;
		link.textContent = displayText;
		link.className = 'hover:underline block truncate w-full';
		link.style.maxWidth = `${maxWidth}px`;
		link.style.whiteSpace = 'nowrap';
		link.style.overflow = 'hidden';
		link.style.textOverflow = 'ellipsis';

		link.onclick = (event) => {
			event.preventDefault();
			const view = get(editorViewStore);
			const resolvedPos = view.state.doc.resolve(heading.pos);
			view.dispatch(view.state.tr.scrollIntoView().setSelection(new NodeSelection(resolvedPos)));
		};

		headingElement.appendChild(link);
		toc.appendChild(headingElement);

		switch (heading.level) {
			case 1:
				headingElement.className += ' text-lg pl-2';
				break;
			case 2:
				headingElement.className += ' text-base pl-4';
				break;
			case 3:
				headingElement.className += ' text-sm pl-8';
				break;
			default:
				headingElement.className += ' text-xs pl-12';
				break;
		}
	});

	return toc;
}

export const tableOfContentsPlugin = new Plugin({
	view() {
		return {
			update(view) {
				const tocContainer = document.getElementById('toc');
				if (!tocContainer) return;

				tocContainer.innerHTML = '';
				const toc = createTableOfContents(view.state.doc);
				tocContainer.appendChild(toc);
			}
		};
	}
});
