// items for the block-handle + menu. keep make() free of UI prompts so any caller can run them.
import type { Schema, Node as PMNode } from 'prosemirror-model';
import type { Component } from 'svelte';
import {
	Type,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Quote,
	Table as TableIcon,
	SquareRadical,
	Code,
	FileCode2,
	FileText
} from '@lucide/svelte';
import { createTableNode } from '$lib/editor/utils/tableUtils';
import { m } from '$lib/paraglide/messages';

export type BlockInsertItem = {
	/** called at render time: this table is module-level, and the locale isn't known yet at module eval. */
	label: () => string;
	icon: Component;
	make: (schema: Schema) => PMNode | null;
	/** 'in' = drop the cursor inside the new block; 'node' = NodeSelection it (atoms / CM blocks). */
	select: 'in' | 'node';
};

export const BLOCK_INSERT_ITEMS: BlockInsertItem[] = [
	{ label: () => m.blockmenu_text(), icon: Type, make: (s) => s.nodes.paragraph.create(), select: 'in' },
	{ label: () => m.blockmenu_heading_1(), icon: Heading1, make: (s) => s.nodes.heading.create({ level: 1 }), select: 'in' },
	{ label: () => m.blockmenu_heading_2(), icon: Heading2, make: (s) => s.nodes.heading.create({ level: 2 }), select: 'in' },
	{ label: () => m.blockmenu_heading_3(), icon: Heading3, make: (s) => s.nodes.heading.create({ level: 3 }), select: 'in' },
	{
		label: () => m.blockmenu_bullet_list(),
		icon: List,
		make: (s) => s.nodes.list.create({ kind: 'bullet', order: null, checked: null, collapsed: false }, s.nodes.paragraph.create()),
		select: 'in'
	},
	{
		label: () => m.blockmenu_numbered_list(),
		icon: ListOrdered,
		make: (s) => s.nodes.list.create({ kind: 'ordered', order: 1, checked: null, collapsed: false }, s.nodes.paragraph.create()),
		select: 'in'
	},
	{
		label: () => m.blockmenu_quote(),
		icon: Quote,
		make: (s) => s.nodes.blockquote?.create(null, s.nodes.paragraph.create()) ?? null,
		select: 'in'
	},
	{
		label: () => m.blockmenu_abstract(),
		icon: FileText,
		// default to the env source form: standard LaTeX shape, accepts multi-paragraph content
		make: (s) => s.nodes.abstract?.create({ sourceForm: 'env' }, s.nodes.paragraph.create()) ?? null,
		select: 'in'
	},
	{ label: () => m.blockmenu_table(), icon: TableIcon, make: (s) => createTableNode(s, 2, 2, true), select: 'node' },
	{ label: () => m.blockmenu_math_block(), icon: SquareRadical, make: (s) => s.nodes.block_math.create({}, s.text(' ')), select: 'node' },
	{ label: () => m.blockmenu_code_block(), icon: Code, make: (s) => s.nodes.code_block.createAndFill(), select: 'node' },
	{ label: () => m.blockmenu_raw_latex(), icon: FileCode2, make: (s) => s.nodes.raw_latex.createAndFill(), select: 'node' }
];
