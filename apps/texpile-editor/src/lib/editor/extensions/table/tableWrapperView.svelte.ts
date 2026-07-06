import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import { mount, unmount } from 'svelte';
import TableWrapperComponent from './TableWrapperComponent.svelte';

function isLabelDuplicate(view: EditorView, label: string | null, currentPos: number): boolean {
	if (!label) return false;

	let isDuplicate = false;
	view.state.doc.descendants((node, pos) => {
		if (node.type.name === 'table_wrapper' && pos !== currentPos) {
			if (node.attrs.label === label) {
				isDuplicate = true;
				return false;
			}
		}
	});
	return isDuplicate;
}

// unused, kept for the future template-driven numbering feature
function _generateUniqueLabel(view: EditorView, baseLabel: string, currentPos: number): string {
	let label = baseLabel;
	let counter = 1;

	while (isLabelDuplicate(view, label, currentPos)) {
		label = `${baseLabel}-${counter}`;
		counter++;
	}

	return label;
}

// matches the CSS counter logic. currently unused (sequential numbering);
// TODO: re-enable when template-driven table numbering is implemented
function getSectionNumber(view: EditorView, pos: number): string | null {
	let h1 = 0;
	let h2 = 0;
	let h3 = 0;

	view.state.doc.nodesBetween(0, pos, (node) => {
		if (node.type.name === 'heading') {
			const level = node.attrs.level;
			if (level === 1) {
				h1++;
				h2 = 0;
				h3 = 0;
			} else if (level === 2) {
				h2++;
				h3 = 0;
			} else if (level === 3) {
				h3++;
			}
		}
	});

	if (h3 > 0) {
		return `${h1}.${h2}.${h3}`;
	} else if (h2 > 0) {
		return `${h1}.${h2}`;
	} else if (h1 > 0) {
		return `${h1}`;
	}
	return null;
}

function getTableNumber(view: EditorView, pos: number): number {
	let count = 0;

	view.state.doc.nodesBetween(0, pos, (node) => {
		if (node.type.name === 'table_wrapper') {
			count++;
		}
	});

	return count + 1;
}

// unused, kept for the future template-driven numbering feature
function _getTableNumberHierarchical(view: EditorView, pos: number): number {
	const _sectionNumber = getSectionNumber(view, pos);
	let count = 0;

	let sectionStart = 0;
	view.state.doc.nodesBetween(0, pos, (node, nodePos) => {
		if (node.type.name === 'heading') {
			sectionStart = nodePos;
		}
	});

	view.state.doc.nodesBetween(sectionStart, pos, (node) => {
		if (node.type.name === 'table_wrapper') {
			count++;
		}
	});

	return count + 1;
}

function getTableNode(tableWrapperNode: Node): Node | null {
	let tableNode: Node | null = null;
	tableWrapperNode.forEach((child) => {
		if (child.type.name === 'table') {
			tableNode = child;
		}
	});
	return tableNode;
}

// the rule before each row (table_row.topRules, e.g. "\hline") plus the rule after the last row
// (table.bottomRules); these drive the editable "Row rules" advanced settings
function collectRowRules(tableWrapperNode: Node): { rowRules: string[]; bottomRule: string } {
	const tableNode = getTableNode(tableWrapperNode);
	const rowRules: string[] = [];
	let bottomRule = '';
	if (tableNode) {
		tableNode.forEach((row) => rowRules.push(String(row.attrs.topRules ?? '')));
		bottomRule = String(tableNode.attrs.bottomRules ?? '');
	}
	return { rowRules, bottomRule };
}

export default function tableWrapperView(node: Node, view: EditorView, getPos: () => number | undefined): NodeView {
	let currentNode = node;

	const dom = document.createElement('div');
	dom.className = 'table-wrapper';
	// refs find this table via data-label
	if (currentNode.attrs.label) {
		dom.setAttribute('data-label', currentNode.attrs.label);
	}

	const componentContainer = document.createElement('div');
	componentContainer.contentEditable = 'false';
	dom.appendChild(componentContainer);

	const contentDOM = document.createElement('div');
	contentDOM.className = 'table-wrapper-content';

	const updateClasses = () => {
		if (currentNode.attrs.showNotes) {
			contentDOM.classList.remove('hide-notes');
		} else {
			contentDOM.classList.add('hide-notes');
		}
	};
	updateClasses();

	dom.appendChild(contentDOM);

	const updateAttrs = (attrs: Partial<typeof node.attrs>) => {
		const pos = getPos();
		if (pos !== undefined) {
			const tr = view.state.tr.setNodeMarkup(pos, undefined, {
				...currentNode.attrs,
				...attrs
			});
			view.dispatch(tr);
		}
	};

	// absolute position of the inner `table` node, for editing its rows' rule attrs
	const getTableAbsPos = (): number | null => {
		const pos = getPos();
		if (pos === undefined) return null;
		let tableAbs: number | null = null;
		currentNode.forEach((child, childOffset) => {
			if (child.type.name === 'table') tableAbs = pos + 1 + childOffset;
		});
		return tableAbs;
	};

	// push the latest row-rule strings into the component after an edit (immediate feedback)
	const refreshRowRules = () => {
		const pos = getPos();
		if (pos === undefined) return;
		const updated = view.state.doc.nodeAt(pos);
		if (updated) {
			const r = collectRowRules(updated);
			componentProps.rowRules = r.rowRules;
			componentProps.bottomRule = r.bottomRule;
		}
	};

	const setRowRule = (rowIndex: number, rule: string) => {
		const tableAbs = getTableAbsPos();
		const tableNode = tableAbs === null ? null : view.state.doc.nodeAt(tableAbs);
		if (tableAbs === null || !tableNode) return;
		let rowAbs: number | null = null;
		let idx = 0;
		tableNode.forEach((_row, offset) => {
			if (idx === rowIndex) rowAbs = tableAbs + 1 + offset;
			idx++;
		});
		if (rowAbs === null) return;
		const row = view.state.doc.nodeAt(rowAbs);
		if (!row) return;
		view.dispatch(view.state.tr.setNodeMarkup(rowAbs, undefined, { ...row.attrs, topRules: rule }));
		refreshRowRules();
	};

	const setBottomRule = (rule: string) => {
		const tableAbs = getTableAbsPos();
		const tableNode = tableAbs === null ? null : view.state.doc.nodeAt(tableAbs);
		if (tableAbs === null || !tableNode) return;
		view.dispatch(view.state.tr.setNodeMarkup(tableAbs, undefined, { ...tableNode.attrs, bottomRules: rule }));
		refreshRowRules();
	};

	const colspecOf = (wrapper: Node): string => String(getTableNode(wrapper)?.attrs.colspec ?? '');
	const envOf = (wrapper: Node): string => String(getTableNode(wrapper)?.attrs.env ?? 'tabular');
	const setColspec = (spec: string) => {
		const tableAbs = getTableAbsPos();
		const tableNode = tableAbs === null ? null : view.state.doc.nodeAt(tableAbs);
		if (tableAbs === null || !tableNode) return;
		// setting a spec also pins env (the serializer's faithful path needs both); an editor-created
		// table with no env becomes a plain tabular carrying the user's spec
		view.dispatch(
			view.state.tr.setNodeMarkup(tableAbs, undefined, { ...tableNode.attrs, colspec: spec, env: tableNode.attrs.env ?? 'tabular' })
		);
		const pos = getPos();
		const updated = pos !== undefined ? view.state.doc.nodeAt(pos) : null;
		if (updated) componentProps.colspec = colspecOf(updated);
	};

	const calculateTableData = () => {
		const pos = getPos();
		if (pos === undefined) return { tableNumber: 1, sectionNumber: null };

		return {
			tableNumber: getTableNumber(view, pos),
			sectionNumber: null // sequential numbering, no section needed
			// FUTURE: Restore for hierarchical numbering
			// sectionNumber: getSectionNumber(view, pos)
		};
	};

	const checkDuplicate = (label: string) => {
		const pos = getPos();
		if (pos === undefined) return false;
		return isLabelDuplicate(view, label, pos);
	};

	const initialData = calculateTableData();

	// $state so prop mutations reach the component (svelte 5)
	const initialRules = collectRowRules(currentNode);
	const componentProps = $state({
		tableNumber: initialData.tableNumber,
		sectionNumber: initialData.sectionNumber,
		node: currentNode,
		updateAttrs,
		checkDuplicate,
		rowRules: initialRules.rowRules,
		bottomRule: initialRules.bottomRule,
		setRowRule,
		setBottomRule,
		colspec: colspecOf(currentNode),
		tableEnv: envOf(currentNode),
		setColspec
	});

	const component = mount(TableWrapperComponent, {
		target: componentContainer,
		props: componentProps
	});

	let lastTableData = initialData;

	return {
		dom,
		contentDOM,
		update(newNode) {
			if (newNode.type !== node.type) return false;
			currentNode = newNode;

			if (currentNode.attrs.label) {
				dom.setAttribute('data-label', currentNode.attrs.label);
			} else {
				dom.removeAttribute('data-label');
			}

			const newTableData = calculateTableData();
			const dataChanged =
				newTableData.tableNumber !== lastTableData.tableNumber || newTableData.sectionNumber !== lastTableData.sectionNumber;

			if (dataChanged) {
				lastTableData = newTableData;
				componentProps.tableNumber = newTableData.tableNumber;
				componentProps.sectionNumber = newTableData.sectionNumber;
			}

			// always update node so caption validation stays reactive
			componentProps.node = currentNode;

			// keep the editable row-rule list + column spec in sync (rows/columns added/removed, etc.)
			const rules = collectRowRules(currentNode);
			componentProps.rowRules = rules.rowRules;
			componentProps.bottomRule = rules.bottomRule;
			componentProps.colspec = colspecOf(currentNode);
			componentProps.tableEnv = envOf(currentNode);

			updateClasses();
			return true;
		},
		destroy() {
			unmount(component);
		},
		// ignore DOM mutations from the svelte component (popover portals, etc.); PM still
		// handles mutations in contentDOM
		ignoreMutation(mutation) {
			if (componentContainer.contains(mutation.target)) {
				return true;
			}
			if (mutation.target === componentContainer) {
				return true;
			}
			return false;
		},
		// keep events inside the settings UI
		stopEvent(event) {
			const target = event.target;
			if (target instanceof HTMLElement && componentContainer.contains(target)) {
				return true;
			}
			return false;
		}
	};
}
