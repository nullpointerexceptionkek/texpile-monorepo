/**
 * Table family serializer, the context-heavy case. one canonical style via the TableStyle
 * descriptor. NOTE: the partial \cline/\cmidrule rewrite for rowspans crossing a horizontal
 * border is not ported; rows use a plain \hline (doesn't affect the common no-rowspan case).
 */

import type { Node } from 'prosemirror-model';
import type { Ctx } from './types';

type SerializeNodeFn = (node: Node, ctx: Ctx) => string;

interface TableStyle {
	width: string;
	headerColFirst: string;
	headerColRest: string;
	defaultCol: string;
	vertical: boolean;
	topRule: boolean;
	rowRule: string;
}

const BORDERED: TableStyle = {
	width: '0.8\\textwidth',
	headerColFirst: 'l',
	headerColRest: 'X',
	defaultCol: 'X',
	vertical: true,
	topRule: true,
	rowRule: ' \\\\\\hline'
};

const ACTIVE_STYLE = BORDERED;

type RowspanCoverage = Map<number, Map<number, { colspan: number }>>;

/** Dispatch entry: only table_wrapper and table need real handling. */
export function serializeTable(node: Node, serializeNode: SerializeNodeFn): string {
	if (node.type.name === 'table_wrapper') return wrapper(node, serializeNode);
	if (node.type.name === 'table') return assembleTable(node, serializeNode);
	if (node.type.name === 'table_caption' || node.type.name === 'table_notes') return renderInline(node, serializeNode);
	return ''; // rows/cells are consumed by their parents
}

function renderInline(node: Node, serializeNode: SerializeNodeFn): string {
	let out = '';
	node.forEach((child, _offset, index) => {
		out += serializeNode(child, { parent: node, index, isLastChild: index === node.childCount - 1, inTableCell: true });
	});
	return out;
}

function childByType(node: Node, typeName: string): Node | null {
	let found: Node | null = null;
	node.forEach((c) => {
		if (!found && c.type.name === typeName) found = c;
	});
	return found;
}

function wrapper(node: Node, serializeNode: SerializeNodeFn): string {
	const captionNode = childByType(node, 'table_caption');
	const tableNode = childByType(node, 'table');
	const notesNode = childByType(node, 'table_notes');

	const caption = captionNode ? `\\caption{${renderInline(captionNode, serializeNode)}}\\vspace{2mm}\n` : '';
	// extra labels re-emit BEFORE the primary, matching source order (`label` holds the LAST
	// \label found, so anything in extraLabels came before it).
	const extraLabels =
		typeof node.attrs.extraLabels === 'string' && node.attrs.extraLabels
			? node.attrs.extraLabels
					.split('\n')
					.map((l: string) => `\\label{${l}}\n`)
					.join('')
			: '';
	const label = node.attrs.label ? `\\label{${String(node.attrs.label)}}\n` : '';
	const preBody = node.attrs.preBody ? `${String(node.attrs.preBody)}\n` : '';
	const body = tableNode ? assembleTable(tableNode, serializeNode) : '';
	const notes = node.attrs.showNotes && notesNode ? `\\par\\smallskip\n{\\small ${renderInline(notesNode, serializeNode)}}` : '';
	// a trailing \vskip/\hskip spacer, not prose: raw, NOT run through the notes' \small wrapper
	const postBody = node.attrs.postBody ? `\n${String(node.attrs.postBody)}` : '';

	const env = node.attrs.spanning ? 'table*' : 'table';
	// placement carries the float's OWN specifier ([t], [H], or '' if the source had none). not
	// hardcoded: [H] forces exact placement while [h] is advisory, so collapsing one to the
	// other can visibly move the table to a different page.
	const placement = node.attrs.placement != null ? String(node.attrs.placement) : '[h]';
	return `\\begin{${env}}${placement}\n\\centering\n${caption}${extraLabels}${label}${preBody}${body}\n${notes}${postBody}\n\\end{${env}}\n`;
}

function buildRowspanCoverage(table: Node): RowspanCoverage {
	const coverage: RowspanCoverage = new Map();
	table.forEach((row, _o, rowIndex) => {
		let colIndex = 0;
		const coveredHere = coverage.get(rowIndex);
		row.forEach((cell) => {
			while (coveredHere?.has(colIndex)) colIndex += coveredHere.get(colIndex)!.colspan;
			const colspan = Number(cell.attrs.colspan ?? 1);
			const rowspan = Number(cell.attrs.rowspan ?? 1);
			if (rowspan > 1) {
				for (let r = rowIndex + 1; r < rowIndex + rowspan; r++) {
					if (!coverage.has(r)) coverage.set(r, new Map());
					coverage.get(r)!.set(colIndex, { colspan });
				}
			}
			colIndex += colspan;
		});
	});
	return coverage;
}

function countColumns(table: Node, coverage: RowspanCoverage): number {
	let n = 0;
	table.forEach((row, _o, rowIndex) => {
		let width = 0;
		row.forEach((cell) => (width += Number(cell.attrs.colspan ?? 1)));
		coverage.get(rowIndex)?.forEach((info) => (width += info.colspan));
		n = Math.max(n, width);
	});
	return n;
}

/** Header column = the first column is row labels (second row's first cell is a header). */
function hasHeaderColumn(table: Node): boolean {
	if (table.childCount < 2) return false;
	const secondRow = table.child(1);
	const firstCell = secondRow.childCount > 0 ? secondRow.child(0) : null;
	return firstCell?.type.name === 'table_header';
}

function columnSpec(numColumns: number, headerCol: boolean): string {
	const style = ACTIVE_STYLE;
	let cols: string;
	if (headerCol) {
		cols = numColumns > 0 ? style.headerColFirst + style.headerColRest.repeat(Math.max(0, numColumns - 1)) : style.headerColFirst;
	} else {
		cols = style.defaultCol.repeat(numColumns);
	}
	if (style.vertical) {
		const sep = '|';
		cols = sep + cols.split('').join(sep) + sep;
	}
	return cols;
}

function assembleTable(table: Node, serializeNode: SerializeNodeFn): string {
	// faithful path: a parsed table carries its exact architecture (env / colspec / width /
	// rules), so reproduce it verbatim instead of the editor's default style.
	const env = table.attrs.env as string | null;
	const colspec = table.attrs.colspec as string | null;
	if (env && colspec != null)
		return assembleFaithful(
			table,
			env,
			colspec,
			table.attrs.tabularxWidth as string | null,
			String(table.attrs.bottomRules ?? ''),
			serializeNode
		);

	// fallback: an editor-created table with no captured architecture gets a bordered tabularx
	const coverage = buildRowspanCoverage(table);
	const numColumns = countColumns(table, coverage);
	const cols = columnSpec(numColumns, hasHeaderColumn(table));

	const rows: string[] = [];
	table.forEach((row, _o, rowIndex) => rows.push(renderRow(row, rowIndex, coverage, serializeNode)));
	const top = ACTIVE_STYLE.topRule ? '\\hline\n' : '';

	return `\\begin{tabularx}{${ACTIVE_STYLE.width}}{${cols}}\n${top}${rows.join('\n')}\n\\end{tabularx}`;
}

/** Reproduce a parsed table exactly from its captured architecture. */
function assembleFaithful(
	table: Node,
	env: string,
	colspec: string,
	width: string | null,
	bottomRules: string,
	serializeNode: SerializeNodeFn
): string {
	const coverage = buildRowspanCoverage(table);
	const lines: string[] = [];
	table.forEach((row, _o, rowIndex) => {
		const top = String(row.attrs.topRules ?? '');
		if (top) lines.push(top);
		const coveredHere = coverage.get(rowIndex);
		const cells: string[] = [];
		let colIndex = 0;
		// emit the placeholder cells LaTeX requires under a \multirow so columns stay aligned
		// (covered grid positions are omitted from the doc)
		const emitCovered = () => {
			while (coveredHere?.has(colIndex)) {
				const info = coveredHere.get(colIndex)!;
				cells.push(placeholderCell(info, colIndex === 0));
				colIndex += info.colspan;
			}
		};
		row.forEach((cell) => {
			emitCovered();
			cells.push(renderCell(cell, colIndex === 0, serializeNode));
			colIndex += Number(cell.attrs.colspan ?? 1);
		});
		emitCovered();
		lines.push(cells.join(' & ') + ' \\\\');
	});
	if (bottomRules) lines.push(bottomRules);
	const widthArg = width != null ? `{${width}}` : '';
	return `\\begin{${env}}${widthArg}{${colspec}}\n${lines.join('\n')}\n\\end{${env}}`;
}

function placeholderCell(info: { colspan: number }, first: boolean): string {
	if (info.colspan > 1) {
		const align = (first ? '|' : '') + 'c|';
		return `\\multicolumn{${info.colspan}}{${align}}{}`;
	}
	return '';
}

function renderRow(row: Node, rowIndex: number, coverage: RowspanCoverage, serializeNode: SerializeNodeFn): string {
	const coveredHere = coverage.get(rowIndex);
	const parts: string[] = [];
	let colIndex = 0;

	row.forEach((cell) => {
		while (coveredHere?.has(colIndex)) {
			const info = coveredHere.get(colIndex)!;
			parts.push(placeholderCell(info, colIndex === 0));
			colIndex += info.colspan;
		}
		parts.push(renderCell(cell, colIndex === 0, serializeNode));
		colIndex += Number(cell.attrs.colspan ?? 1);
	});
	// trailing covered positions
	while (coveredHere?.has(colIndex)) {
		const info = coveredHere.get(colIndex)!;
		parts.push(placeholderCell(info, colIndex === 0));
		colIndex += info.colspan;
	}

	const joined = parts.map((p, i) => (i < parts.length - 1 ? p + ' &' : p)).join('');
	return joined + ACTIVE_STYLE.rowRule;
}

function renderCell(cell: Node, isFirstColumn: boolean, serializeNode: SerializeNodeFn): string {
	// paragraphs joined with \par, blank ones dropped. .trim() decides blankness, but the PUSHED
	// string is untrimmed: a macro producing literal edge spaces as content (\quad row-label
	// indents) must not be stripped like incidental whitespace, and a flat-string trim can't
	// tell the two apart.
	const pieces: string[] = [];
	cell.forEach((p, _o, index) => {
		const s = serializeNode(p, { parent: cell, index, isLastChild: index === cell.childCount - 1, inTableCell: true });
		if (s.trim().length > 0) pieces.push(s);
	});
	let content = pieces.join(' \\par ');

	const colspan = Number(cell.attrs.colspan ?? 1);
	const rowspan = Number(cell.attrs.rowspan ?? 1);

	if (rowspan > 1) content = `\\multirow{${rowspan}}{*}{${content}}`;
	if (colspan > 1) {
		const align = (isFirstColumn ? '|' : '') + 'c|';
		content = `\\multicolumn{${colspan}}{${align}}{${content}}`;
	}
	return content;
}
