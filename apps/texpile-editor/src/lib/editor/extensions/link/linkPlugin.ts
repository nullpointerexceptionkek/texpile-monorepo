// auto-links pasted URLs and shows a tooltip when the cursor sits in a link
import { Plugin, PluginKey, type EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Mark } from 'prosemirror-model';
import { createLinkTooltip, destroyLinkTooltip } from './linkTooltipFactory';

export interface LinkPluginState {
	activeLinkMark: Mark | null;
	linkFrom: number;
	linkTo: number;
	tooltipVisible: boolean;
}

export const LINK_PLUGIN_KEY = new PluginKey<LinkPluginState>('link-tooltip');

const URL_REGEX = /https?:\/\/[^\s<>[\]{}|\\^]+|www\.[^\s<>[\]{}|\\^]+/gi;

function isValidUrl(text: string): boolean {
	try {
		let urlToTest = text;
		if (text.startsWith('www.')) {
			urlToTest = 'https://' + text;
		}
		new URL(urlToTest);
		return URL_REGEX.test(text);
	} catch {
		return false;
	}
}

function normalizeUrl(url: string): string {
	if (url.startsWith('www.')) {
		return 'https://' + url;
	}
	return url;
}

/** finds the link mark at pos plus the full extent of adjacent text carrying the same mark. */
function getLinkMarkAtPos(state: EditorState, pos: number): { mark: Mark; from: number; to: number } | null {
	const $pos = state.doc.resolve(pos);
	const linkType = state.schema.marks.link;
	if (!linkType) return null;

	const marks = $pos.marks();
	const linkMark = marks.find((m) => m.type === linkType);
	if (!linkMark) return null;

	let from = pos;
	let to = pos;

	const parent = $pos.parent;
	const parentOffset = $pos.parentOffset;

	// find the text node containing pos
	let offset = 0;
	for (let i = 0; i < parent.childCount; i++) {
		const child = parent.child(i);
		const childStart = offset;
		const childEnd = offset + child.nodeSize;

		if (parentOffset >= childStart && parentOffset <= childEnd) {
			if (child.isText && child.marks.some((m) => m.type === linkType && m.eq(linkMark))) {
				from = $pos.start() + childStart;
				to = $pos.start() + childEnd;

				for (let j = i - 1; j >= 0; j--) {
					const prevChild = parent.child(j);
					if (prevChild.isText && prevChild.marks.some((m) => m.type === linkType && m.eq(linkMark))) {
						from -= prevChild.nodeSize;
					} else {
						break;
					}
				}

				for (let j = i + 1; j < parent.childCount; j++) {
					const nextChild = parent.child(j);
					if (nextChild.isText && nextChild.marks.some((m) => m.type === linkType && m.eq(linkMark))) {
						to += nextChild.nodeSize;
					} else {
						break;
					}
				}

				return { mark: linkMark, from, to };
			}
		}
		offset += child.nodeSize;
	}

	return null;
}

function showLinkTooltip(
	view: EditorView,
	mark: Mark,
	from: number,
	to: number,
	onUpdate: (href: string, title: string | null) => void,
	onRemove: () => void
) {
	const coords = view.coordsAtPos(from);
	const linkText = view.state.doc.textBetween(from, to);

	createLinkTooltip({
		href: mark.attrs.href,
		title: mark.attrs.title,
		linkText,
		position: { x: coords.left, y: coords.bottom },
		onUpdate,
		onRemove,
		onClose: () => {
			destroyLinkTooltip();
		}
	});
}

export function createLinkPlugin() {
	return new Plugin<LinkPluginState>({
		key: LINK_PLUGIN_KEY,

		state: {
			init(): LinkPluginState {
				return {
					activeLinkMark: null,
					linkFrom: 0,
					linkTo: 0,
					tooltipVisible: false
				};
			},

			apply(tr, value, oldState, newState): LinkPluginState {
				if (!tr.docChanged && !tr.selectionSet) {
					return value;
				}

				const selection = newState.selection;

				// only for a collapsed cursor
				if (!(selection instanceof TextSelection) || !selection.empty) {
					return {
						activeLinkMark: null,
						linkFrom: 0,
						linkTo: 0,
						tooltipVisible: false
					};
				}

				const linkInfo = getLinkMarkAtPos(newState, selection.from);

				if (linkInfo) {
					return {
						activeLinkMark: linkInfo.mark,
						linkFrom: linkInfo.from,
						linkTo: linkInfo.to,
						tooltipVisible: true
					};
				}

				return {
					activeLinkMark: null,
					linkFrom: 0,
					linkTo: 0,
					tooltipVisible: false
				};
			}
		},

		props: {
			// clicking a link shouldn't navigate; PM handles selection
			handleClick(view, pos, event) {
				const target = event.target as HTMLElement;
				if (target.tagName === 'A' && target.hasAttribute('href')) {
					event.preventDefault();
					return false;
				}
				return false;
			},

			handlePaste(view, event, _slice) {
				const text = event.clipboardData?.getData('text/plain')?.trim();
				if (!text) return false;

				if (!isValidUrl(text)) return false;

				const { state, dispatch } = view;
				const { from, to } = state.selection;
				const linkType = state.schema.marks.link;

				if (!linkType) return false;

				// wrap selected text with the link, else insert the URL as the link text
				const hasSelection = from !== to;
				const href = normalizeUrl(text);

				if (hasSelection) {
					const tr = state.tr.addMark(from, to, linkType.create({ href, title: null }));
					dispatch(tr);
				} else {
					const linkMark = linkType.create({ href, title: null });
					const textNode = state.schema.text(text, [linkMark]);
					const tr = state.tr.replaceSelectionWith(textNode, false);
					dispatch(tr);
				}

				return true;
			}
		},

		view(editorView) {
			let currentState: LinkPluginState = {
				activeLinkMark: null,
				linkFrom: 0,
				linkTo: 0,
				tooltipVisible: false
			};

			const updateTooltip = () => {
				const pluginState = LINK_PLUGIN_KEY.getState(editorView.state);
				if (!pluginState) return;

				const stateChanged =
					pluginState.activeLinkMark !== currentState.activeLinkMark ||
					pluginState.linkFrom !== currentState.linkFrom ||
					pluginState.linkTo !== currentState.linkTo;

				if (!stateChanged) return;

				currentState = pluginState;

				if (!pluginState.activeLinkMark || !pluginState.tooltipVisible) {
					destroyLinkTooltip();
					return;
				}

				showLinkTooltip(
					editorView,
					pluginState.activeLinkMark,
					pluginState.linkFrom,
					pluginState.linkTo,
					(href, title) => {
						// update link attrs and optionally the text
						const { state, dispatch } = editorView;
						const linkType = state.schema.marks.link;
						if (!linkType) return;

						const from = pluginState.linkFrom;
						const to = pluginState.linkTo;
						const currentText = state.doc.textBetween(from, to);
						const newMark = linkType.create({ href, title });

						let tr = state.tr;

						if (title && title !== currentText) {
							const textNode = state.schema.text(title, [newMark]);
							tr = tr.replaceWith(from, to, textNode);
						} else {
							tr = tr.removeMark(from, to, linkType).addMark(from, to, newMark);
						}

						dispatch(tr);
						destroyLinkTooltip();
					},
					() => {
						const { state, dispatch } = editorView;
						const linkType = state.schema.marks.link;
						if (!linkType) return;

						const tr = state.tr.removeMark(pluginState.linkFrom, pluginState.linkTo, linkType);
						dispatch(tr);
						destroyLinkTooltip();
					}
				);
			};

			return {
				update(_view) {
					updateTooltip();
				},

				destroy() {
					destroyLinkTooltip();
				}
			};
		}
	});
}
