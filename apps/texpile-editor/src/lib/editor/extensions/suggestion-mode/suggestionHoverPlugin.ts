// accept/reject tooltip on hover over suggestion marks or node-level suggestions
import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Mark } from 'prosemirror-model';
import { acceptSuggestionsInRange, rejectSuggestionsInRange } from './acceptReject';
import { createSuggestionTooltip, destroySuggestionTooltip, isSuggestionTooltipVisible } from './suggestionTooltipFactory';

const SUGGESTION_HOVER_KEY = new PluginKey('suggestion-hover');
const HIDE_DELAY = 200;

/** full range of the suggestion mark within its parent text block. */
function findSuggestionMarkRange(view: EditorView, pos: number): { mark: Mark; from: number; to: number } | null {
	const state = view.state;
	const $pos = state.doc.resolve(pos);
	const marks = $pos.marks();

	const suggestionMark = marks.find((m) => m.type.name === 'suggestion_insert' || m.type.name === 'suggestion_delete');
	if (!suggestionMark) return null;

	const parent = $pos.parent;
	const parentOffset = $pos.parentOffset;
	const blockStart = $pos.start();

	let offset = 0;
	for (let i = 0; i < parent.childCount; i++) {
		const child = parent.child(i);
		const childStart = offset;
		const childEnd = offset + child.nodeSize;

		if (parentOffset >= childStart && parentOffset <= childEnd) {
			if (!child.isText || !child.marks.some((m) => m.eq(suggestionMark))) {
				break;
			}

			let from = blockStart + childStart;
			let to = blockStart + childEnd;

			for (let j = i - 1; j >= 0; j--) {
				const prev = parent.child(j);
				if (prev.isText && prev.marks.some((m) => m.eq(suggestionMark))) {
					from -= prev.nodeSize;
				} else {
					break;
				}
			}

			for (let j = i + 1; j < parent.childCount; j++) {
				const next = parent.child(j);
				if (next.isText && next.marks.some((m) => m.eq(suggestionMark))) {
					to += next.nodeSize;
				} else {
					break;
				}
			}

			return { mark: suggestionMark, from, to };
		}
		offset += child.nodeSize;
	}

	return null;
}

function findSuggestionElement(target: EventTarget | null): HTMLElement | null {
	let el = target as HTMLElement | null;
	while (el && el !== document.body) {
		if (
			el.classList?.contains('suggestion-add') ||
			el.classList?.contains('suggestion-delete') ||
			el.classList?.contains('suggestion-node-insert') ||
			el.classList?.contains('suggestion-node-delete')
		) {
			return el;
		}
		el = el.parentElement;
	}
	return null;
}

function hasSuggestions(view: EditorView): boolean {
	let found = false;
	view.state.doc.descendants((node) => {
		if (found) return false;
		if (node.marks?.some((m) => m.type.name === 'suggestion_insert' || m.type.name === 'suggestion_delete')) {
			found = true;
			return false;
		}
		if (node.attrs.suggestion?.type === 'insert' || node.attrs.suggestion?.type === 'delete') {
			found = true;
			return false;
		}
	});
	return found;
}

/** node-level suggestion at pos, for non-markable nodes. */
function findSuggestionNode(view: EditorView, pos: number): { from: number; to: number; username: string | null } | null {
	const state = view.state;
	const $pos = state.doc.resolve(pos);

	for (let depth = $pos.depth; depth >= 0; depth--) {
		const node = $pos.node(depth);
		const sugg = node.attrs.suggestion;
		if (sugg?.type === 'insert' || sugg?.type === 'delete') {
			const from = $pos.before(depth);
			return {
				from,
				to: from + node.nodeSize,
				username: sugg.username || null
			};
		}
	}

	// atoms/leaf nodes sit at pos itself
	if (pos < state.doc.content.size) {
		const nodeAtPos = state.doc.nodeAt(pos);
		const sugg = nodeAtPos?.attrs.suggestion;
		if (sugg?.type === 'insert' || sugg?.type === 'delete') {
			return {
				from: pos,
				to: pos + nodeAtPos!.nodeSize,
				username: sugg.username || null
			};
		}
	}

	return null;
}

export interface SuggestionHoverPluginOptions {
	onAllResolved?: () => void;
	description?: string;
}

export function suggestionHoverPlugin(options: SuggestionHoverPluginOptions = {}): Plugin {
	const { onAllResolved, description } = options;
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentFrom = -1;
	let currentTo = -1;

	function clearHideTimeout() {
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	}

	function scheduleHide() {
		clearHideTimeout();
		hideTimeout = setTimeout(() => {
			destroySuggestionTooltip();
			currentFrom = -1;
			currentTo = -1;
		}, HIDE_DELAY);
	}

	function showTooltip(view: EditorView, from: number, to: number, mark?: Mark, nodeUsername?: string | null) {
		if (currentFrom === from && currentTo === to && isSuggestionTooltipVisible()) return;

		currentFrom = from;
		currentTo = to;

		const coords = view.coordsAtPos(from);

		const username = mark?.attrs?.username || nodeUsername;
		const tooltipDescription = username ? `${username}'s AI` : description;

		createSuggestionTooltip({
			position: { x: coords.left, y: coords.top },
			description: tooltipDescription,
			onAccept: () => {
				acceptSuggestionsInRange(from, to)(view.state, view.dispatch);
				destroySuggestionTooltip();
				currentFrom = -1;
				currentTo = -1;
				if (!hasSuggestions(view)) {
					onAllResolved?.();
				}
			},
			onReject: () => {
				rejectSuggestionsInRange(from, to)(view.state, view.dispatch);
				destroySuggestionTooltip();
				currentFrom = -1;
				currentTo = -1;
				if (!hasSuggestions(view)) {
					onAllResolved?.();
				}
			},
			onClose: () => {
				destroySuggestionTooltip();
				currentFrom = -1;
				currentTo = -1;
			}
		});
	}

	return new Plugin({
		key: SUGGESTION_HOVER_KEY,

		props: {
			handleDOMEvents: {
				mouseover(view: EditorView, event: MouseEvent) {
					const suggestionEl = findSuggestionElement(event.target);
					if (!suggestionEl) return false;

					clearHideTimeout();

					const coords = { left: event.clientX, top: event.clientY };
					const posInfo = view.posAtCoords(coords);
					if (!posInfo) return false;

					const range = findSuggestionMarkRange(view, posInfo.pos);
					if (range) {
						showTooltip(view, range.from, range.to, range.mark);
						return false;
					}

					const nodeSugg = findSuggestionNode(view, posInfo.pos);
					if (!nodeSugg) return false;

					showTooltip(view, nodeSugg.from, nodeSugg.to, undefined, nodeSugg.username);
					return false;
				},

				mouseout(view: EditorView, event: MouseEvent) {
					if (!isSuggestionTooltipVisible()) return false;

					const relatedTarget = event.relatedTarget as HTMLElement | null;

					// don't hide if moving onto the tooltip itself
					const tooltipContainer = document.getElementById('suggestion-tooltip-container');
					if (tooltipContainer?.contains(relatedTarget)) {
						clearHideTimeout();
						return false;
					}

					// don't hide if moving to another suggestion element
					if (relatedTarget && findSuggestionElement(relatedTarget)) {
						return false;
					}

					scheduleHide();
					return false;
				}
			}
		},

		view() {
			return {
				destroy() {
					clearHideTimeout();
					destroySuggestionTooltip();
				}
			};
		}
	});
}
