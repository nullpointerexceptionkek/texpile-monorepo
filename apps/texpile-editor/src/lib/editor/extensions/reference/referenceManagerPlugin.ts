import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import type { BibLaTeXReference } from '$lib/biblatex';
import { referenceStore, templateFeaturesStore } from '$lib/stores/editorStore';
import { get } from 'svelte/store';
import { mount, unmount } from 'svelte';
import ReferencePickerDropdown from './ReferencePickerDropdown.svelte';
import type { TexpileSuggester } from '../suggest/texpile-suggest';

// table/figure/equation shapes share these; the filter reads the per-kind text field (caption/alt/content)
export interface ReferenceItemMeta {
	label: string;
	number: number;
	position: number;
	section?: string;
	caption?: string;
	alt?: string;
	content?: string;
	lineIndex?: number;
}

export interface ReferenceItem {
	type: 'bibliography' | 'equation' | 'figure' | 'table';
	id: string;
	displayText: string;
	subtitle?: string;
	data: BibLaTeXReference | ReferenceItemMeta;
}

let selectedIndex = 0;
let referenceList: ReferenceItem[] = [];
let dropdownComponent: ReturnType<typeof mount> | null = null;
let dropdownContainer: HTMLElement | null = null;
let currentView: EditorView | null = null;
let currentRange: { from: number; to: number } | null = null;

function convertBibliographyToReferenceItems(citations: BibLaTeXReference[]): ReferenceItem[] {
	return citations.map((citation) => ({
		type: 'bibliography',
		id: citation.key,
		displayText: `${citation.author || 'Unknown'} (${citation.year || citation.date?.slice(0, 4) || 'n.d.'})`,
		subtitle: citation.title,
		data: citation
	}));
}

function extractTableReferences(view: EditorView): ReferenceItem[] {
	const tables: ReferenceItem[] = [];
	let tableCount = 0;

	let currentSection = '';

	view.state.doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			currentSection = node.textContent || '';
		}

		if (node.type.name === 'table_wrapper' && node.attrs.label) {
			tableCount++;

			let captionText = '';
			if (node.firstChild && node.firstChild.type.name === 'table_caption') {
				captionText = node.firstChild.textContent || '';
			}

			let subtitle = '';
			if (currentSection && captionText) {
				subtitle = `${currentSection} • ${captionText}`;
			} else if (currentSection) {
				subtitle = currentSection;
			} else if (captionText) {
				subtitle = captionText;
			} else {
				subtitle = node.attrs.label;
			}

			tables.push({
				type: 'table',
				id: node.attrs.label,
				displayText: `Table ${tableCount}`,
				subtitle: subtitle,
				data: {
					label: node.attrs.label,
					number: tableCount,
					position: pos,
					section: currentSection,
					caption: captionText
				}
			});
		}
	});

	return tables;
}

function extractFigureReferences(view: EditorView): ReferenceItem[] {
	const figures: ReferenceItem[] = [];
	let figureCount = 0;

	let currentSection = '';

	view.state.doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			currentSection = node.textContent || '';
		}

		if (node.type.name === 'image' && node.attrs.label && node.attrs.numbered !== false) {
			figureCount++;

			// the image node's text children are the caption
			let captionText = '';
			node.descendants((child) => {
				if (child.isText) {
					captionText += child.text;
				}
			});
			captionText = captionText.trim();

			let subtitle = '';
			if (currentSection && captionText) {
				subtitle = `${currentSection} • ${captionText}`;
			} else if (currentSection) {
				subtitle = currentSection;
			} else if (captionText) {
				subtitle = captionText;
			} else {
				subtitle = node.attrs.label;
			}

			figures.push({
				type: 'figure',
				id: node.attrs.label,
				displayText: `Figure ${figureCount}`,
				subtitle: subtitle,
				data: {
					label: node.attrs.label,
					number: figureCount,
					position: pos,
					section: currentSection,
					caption: captionText,
					alt: node.attrs.alt || ''
				}
			});
		}
	});

	return figures;
}

function extractEquationReferences(view: EditorView): ReferenceItem[] {
	const equations: ReferenceItem[] = [];
	let equationCount = 0;

	let currentSection = '';

	view.state.doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			currentSection = node.textContent || '';
		}

		if (node.type.name === 'block_math' && node.attrs.numbered) {
			const equationContent = node.textContent || '';
			const lineLabels = (node.attrs.lineLabels as string[]) || [];
			const hasMultiLineLabels = lineLabels.some((l) => l && l.trim());

			if (hasMultiLineLabels) {
				lineLabels.forEach((label, index) => {
					if (label && label.trim()) {
						equationCount++;

						const lines = equationContent.split(/\\\\/);
						const lineContent = lines[index]?.trim() || '';
						const preview = lineContent.length > 40 ? lineContent.substring(0, 40) + '...' : lineContent;

						let subtitle = '';
						if (currentSection && preview) {
							subtitle = `${currentSection} • ${preview}`;
						} else if (currentSection) {
							subtitle = currentSection;
						} else if (preview) {
							subtitle = preview;
						} else {
							subtitle = label;
						}

						equations.push({
							type: 'equation',
							id: label,
							displayText: `Equation ${equationCount}`,
							subtitle: subtitle,
							data: {
								label: label,
								number: equationCount,
								position: pos,
								section: currentSection,
								content: lineContent,
								lineIndex: index
							}
						});
					}
				});
			} else if (node.attrs.label) {
				equationCount++;

				const preview = equationContent.length > 50 ? equationContent.substring(0, 50) + '...' : equationContent;

				let subtitle = '';
				if (currentSection && preview) {
					subtitle = `${currentSection} • ${preview}`;
				} else if (currentSection) {
					subtitle = currentSection;
				} else if (preview) {
					subtitle = preview;
				} else {
					subtitle = node.attrs.label;
				}

				equations.push({
					type: 'equation',
					id: node.attrs.label,
					displayText: `Equation ${equationCount}`,
					subtitle: subtitle,
					data: {
						label: node.attrs.label,
						number: equationCount,
						position: pos,
						section: currentSection,
						content: equationContent
					}
				});
			}
		}
	});

	return equations;
}

function filterReferences(items: ReferenceItem[], query: string): ReferenceItem[] {
	if (!query) return items;

	const searchTerm = query.toLowerCase();
	return items.filter((item) => {
		if (item.type === 'bibliography') {
			const citation = item.data as BibLaTeXReference;
			const authorStr = Array.isArray(citation.author) ? citation.author.join(' ') : citation.author || '';

			// auto-generated texpile-cite- keys aren't searchable, user custom keys are
			const searchableKey = citation.key?.startsWith('texpile-cite-') ? '' : citation.key?.toLowerCase() || '';

			return (
				searchableKey.includes(searchTerm) ||
				authorStr.toLowerCase().includes(searchTerm) ||
				citation.title?.toLowerCase().includes(searchTerm) ||
				citation.year?.toString().includes(searchTerm)
			);
		} else if (item.type === 'table') {
			const meta = item.data as ReferenceItemMeta;
			const section = meta.section || '';
			const caption = meta.caption || '';

			return (
				item.displayText.toLowerCase().includes(searchTerm) ||
				section.toLowerCase().includes(searchTerm) ||
				caption.toLowerCase().includes(searchTerm) ||
				item.id.toLowerCase().includes(searchTerm)
			);
		} else if (item.type === 'figure') {
			const meta = item.data as ReferenceItemMeta;
			const section = meta.section || '';
			const caption = meta.caption || '';
			const alt = meta.alt || '';

			return (
				item.displayText.toLowerCase().includes(searchTerm) ||
				section.toLowerCase().includes(searchTerm) ||
				caption.toLowerCase().includes(searchTerm) ||
				alt.toLowerCase().includes(searchTerm) ||
				item.id.toLowerCase().includes(searchTerm)
			);
		} else if (item.type === 'equation') {
			const meta = item.data as ReferenceItemMeta;
			const section = meta.section || '';
			const content = meta.content || '';

			return (
				item.displayText.toLowerCase().includes(searchTerm) ||
				section.toLowerCase().includes(searchTerm) ||
				content.toLowerCase().includes(searchTerm) ||
				item.id.toLowerCase().includes(searchTerm)
			);
		}
		return false;
	});
}

const suggestReference: TexpileSuggester = {
	char: '@',
	name: 'reference-manager',
	supportedCharacters: /[a-zA-Z0-9\s_]/,
	maxQueryLength: 30,
	suggestClassName:
		'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded px-0.5 underline decoration-wavy decoration-primary-500 dark:decoration-primary-400',
	onChange: (params) => {
		const { query, range, view } = params;

		currentView = view;
		currentRange = range;

		const features = get(templateFeaturesStore);
		const citationsEnabled = features?.citations ?? true;

		const citations = get(referenceStore) || [];
		const bibliographyItems = citationsEnabled ? convertBibliographyToReferenceItems(citations) : [];
		const tableItems = extractTableReferences(view);
		const figureItems = extractFigureReferences(view);
		const equationItems = extractEquationReferences(view);

		const allReferences = [...bibliographyItems, ...tableItems, ...figureItems, ...equationItems];

		referenceList = filterReferences(allReferences, query.full);
		selectedIndex = 0;

		showDropdown(view, range.from, referenceList, selectedIndex, query.full);
	},

	onExit: (_params) => {
		hideDropdown();
	}
};

const keymapPlugin = keymap({
	ArrowDown: () => {
		if (referenceList.length > 0) {
			selectedIndex = (selectedIndex + 1) % referenceList.length;
			updateDropdown(selectedIndex);
			return true;
		}
		return false;
	},
	ArrowUp: () => {
		if (referenceList.length > 0) {
			selectedIndex = (selectedIndex - 1 + referenceList.length) % referenceList.length;
			updateDropdown(selectedIndex);
			return true;
		}
		return false;
	},
	Enter: (_state, _dispatch) => {
		if (referenceList.length > 0 && currentView) {
			handleReferenceSelection(referenceList[selectedIndex]);
			return true;
		}
		return false;
	},
	Escape: () => {
		if (referenceList.length > 0) {
			hideDropdown();
			return true;
		}
		return false;
	}
});

function handleReferenceSelection(item: ReferenceItem) {
	if (!currentView || !currentRange) return;

	const state = currentView.state;
	const tr = state.tr;

	if (item.type === 'bibliography') {
		const attrs = {
			prenote: '',
			postnote: '',
			variant: 'autocite'
		};
		const citationNode = state.schema.nodes.citation.create(attrs, state.schema.text(item.id));

		// insert first (shifts positions), then walk back to find and delete the @query text
		tr.insert(state.selection.from, citationNode);

		const $from = state.selection.$from;
		let atPosition = $from.pos;
		while (atPosition > $from.start() && state.doc.textBetween(atPosition - 1, atPosition) !== '@') {
			atPosition--;
		}

		if (state.doc.textBetween(atPosition - 1, atPosition) === '@') {
			tr.delete(atPosition - 1, $from.pos);
		}
	} else if (item.type === 'table') {
		const refNode = state.schema.nodes.ref.create({ refType: 'table' }, state.schema.text(item.id));

		tr.insert(state.selection.from, refNode);

		const $from = state.selection.$from;
		let atPosition = $from.pos;
		while (atPosition > $from.start() && state.doc.textBetween(atPosition - 1, atPosition) !== '@') {
			atPosition--;
		}

		if (state.doc.textBetween(atPosition - 1, atPosition) === '@') {
			tr.delete(atPosition - 1, $from.pos);
		}
	} else if (item.type === 'figure') {
		const refNode = state.schema.nodes.ref.create({ refType: 'figure' }, state.schema.text(item.id));

		tr.insert(state.selection.from, refNode);

		const $from = state.selection.$from;
		let atPosition = $from.pos;
		while (atPosition > $from.start() && state.doc.textBetween(atPosition - 1, atPosition) !== '@') {
			atPosition--;
		}

		if (state.doc.textBetween(atPosition - 1, atPosition) === '@') {
			tr.delete(atPosition - 1, $from.pos);
		}
	} else if (item.type === 'equation') {
		const refNode = state.schema.nodes.ref.create({ refType: 'equation' }, state.schema.text(item.id));

		tr.insert(state.selection.from, refNode);

		const $from = state.selection.$from;
		let atPosition = $from.pos;
		while (atPosition > $from.start() && state.doc.textBetween(atPosition - 1, atPosition) !== '@') {
			atPosition--;
		}

		if (state.doc.textBetween(atPosition - 1, atPosition) === '@') {
			tr.delete(atPosition - 1, $from.pos);
		}
	}

	currentView.dispatch(tr);
	hideDropdown();
}

function showDropdown(view: EditorView, pos: number, items: ReferenceItem[], selectedIndex: number, query: string) {
	if (!dropdownContainer) {
		dropdownContainer = document.createElement('div');
		dropdownContainer.className = 'reference-picker-container';
		dropdownContainer.style.position = 'fixed';
		dropdownContainer.style.zIndex = '50';
		document.body.appendChild(dropdownContainer);
	}

	if (dropdownComponent) {
		unmount(dropdownComponent);
	}

	dropdownComponent = mount(ReferencePickerDropdown, {
		target: dropdownContainer,
		props: {
			items,
			selectedIndex,
			query,
			onSelect: handleReferenceSelection
		}
	});

	// coordsAtPos is viewport-relative, so use fixed positioning
	const coords = view.coordsAtPos(pos);
	const windowHeight = window.innerHeight;
	const windowWidth = window.innerWidth;

	// wait a frame so the dropdown has real dimensions
	requestAnimationFrame(() => {
		const dropdownRect = dropdownContainer.getBoundingClientRect();
		const dropdownHeight = dropdownRect.height;
		const dropdownWidth = dropdownRect.width || 384; // fallback to 384px (w-96)

		const spaceBelow = windowHeight - coords.bottom;
		const spaceAbove = coords.top;

		let top: number;
		if (spaceBelow >= dropdownHeight + 4 || spaceBelow >= spaceAbove) {
			top = coords.bottom + 4;
		} else {
			top = coords.top - dropdownHeight - 4;
		}

		let left = coords.left;
		if (left + dropdownWidth > windowWidth) {
			left = windowWidth - dropdownWidth - 10;
		}

		dropdownContainer.style.left = `${left}px`;
		dropdownContainer.style.top = `${top}px`;
	});
}

function updateDropdown(newSelectedIndex: number) {
	if (!dropdownComponent || !dropdownContainer) return;

	// svelte 5 mount props aren't reactive from outside, so remount with new props
	unmount(dropdownComponent);
	dropdownComponent = mount(ReferencePickerDropdown, {
		target: dropdownContainer,
		props: {
			items: referenceList,
			selectedIndex: newSelectedIndex,
			query: '',
			onSelect: handleReferenceSelection
		}
	});
}

function hideDropdown() {
	if (dropdownComponent) {
		unmount(dropdownComponent);
		dropdownComponent = null;
	}
	if (dropdownContainer) {
		dropdownContainer.remove();
		dropdownContainer = null;
	}
	referenceList = [];
	selectedIndex = 0;
	currentView = null;
	currentRange = null;
}

export { suggestReference, keymapPlugin };
