import type { Node } from 'prosemirror-model';

/** Context threaded down the serialization walk (parent + index give sibling lookups). */
export interface Ctx {
	/** The parent node, or null at the document root. */
	parent: Node | null;
	/** This node's index within its parent. */
	index: number;
	/** Whether this node is the last child of its parent. */
	isLastChild: boolean;
	/** Inside a table cell: suppresses \par and surrounding newlines. */
	inTableCell: boolean;
}

export type NodeHandler = (node: Node, ctx: Ctx) => string;
