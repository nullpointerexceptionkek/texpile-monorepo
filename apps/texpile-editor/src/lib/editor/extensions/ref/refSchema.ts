import type { NodeSpec } from 'prosemirror-model';

export const refNodeSpec: NodeSpec = {
	group: 'inline',
	content: 'text*',
	inline: true,
	atom: true,
	attrs: {
		// 'reference' is the general/default type when the target kind is unknown; specific types
		// are only set when the label clearly identifies one (tab:/fig:/eq: or \eqref/\pageref)
		refType: { default: 'reference' },
		// the original latex command (ref, eqref, cref, ...) so it round-trips verbatim
		// instead of being normalised to \autoref
		command: { default: 'autoref' }
	},
	toDOM: (node) => [
		'span',
		{
			class: 'ref-node',
			'data-ref-type': node.attrs.refType,
			'data-command': node.attrs.command
		},
		0
	],
	parseDOM: [
		{
			tag: 'span.ref-node',
			getAttrs: (dom: HTMLElement) => ({
				refType: dom.getAttribute('data-ref-type') || 'reference',
				command: dom.getAttribute('data-command') || 'autoref'
			})
		}
	]
};
