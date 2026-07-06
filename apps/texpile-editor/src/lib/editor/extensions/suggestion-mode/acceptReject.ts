import type { Mark, Node as PmNode } from 'prosemirror-model';
import { suggestionTransactionKey } from './key';
import type { EditorState, Transaction, Command } from 'prosemirror-state';

interface MarkedRange {
	mark: Mark;
	from: number;
	to: number;
}

interface NodeSuggestion {
	pos: number;
	node: PmNode;
	type: 'insert' | 'delete';
	username: string | null;
}

const findSuggestionsInRange = (state: EditorState, from: number, to: number): MarkedRange[] => {
	const markRanges = new Map<Mark, { from: number; to: number }>();

	state.doc.nodesBetween(from, to, (node, pos) => {
		node.marks.forEach((mark) => {
			if (mark.type.name === 'suggestion_insert' || mark.type.name === 'suggestion_delete') {
				const range = markRanges.get(mark) || { from: pos, to: pos };
				range.from = Math.min(range.from, pos);
				range.to = Math.max(range.to, pos + node.nodeSize);
				markRanges.set(mark, range);
			}
		});
	});

	return Array.from(markRanges.entries()).map(([mark, range]) => ({
		mark,
		from: range.from,
		to: range.to
	}));
};

const findNodeSuggestionsInRange = (state: EditorState, from: number, to: number): NodeSuggestion[] => {
	const results: NodeSuggestion[] = [];

	state.doc.nodesBetween(from, to, (node, pos) => {
		const sugg = node.attrs.suggestion;
		if (sugg?.type === 'insert' || sugg?.type === 'delete') {
			results.push({
				pos,
				node,
				type: sugg.type,
				username: sugg.username || null
			});
		}
	});

	return results;
};

const processSuggestionsInRange = (acceptOrReject: 'accept' | 'reject', from: number, to: number): Command => {
	return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
		const markSuggestions = findSuggestionsInRange(state, from, to);
		const nodeSuggestions = findNodeSuggestionsInRange(state, from, to);
		if ((!markSuggestions.length && !nodeSuggestions.length) || !dispatch) return false;

		const tr = state.tr;
		tr.setMeta(suggestionTransactionKey, { skipSuggestionOperation: true });

		markSuggestions.forEach(({ mark, from: originalFrom, to: originalTo }) => {
			const adjustedFrom = tr.mapping.map(originalFrom);
			const adjustedTo = tr.mapping.map(originalTo);
			const markToDelete = acceptOrReject === 'accept' ? 'suggestion_delete' : 'suggestion_insert';

			if (mark.type.name === markToDelete) {
				tr.delete(adjustedFrom, adjustedTo);
			} else {
				tr.removeMark(adjustedFrom, adjustedTo, mark.type);
			}
		});

		// node-level suggestions in reverse order to keep positions stable
		const typeToDelete = acceptOrReject === 'accept' ? 'delete' : 'insert';
		for (let i = nodeSuggestions.length - 1; i >= 0; i--) {
			const { pos, node, type } = nodeSuggestions[i];
			const adjustedPos = tr.mapping.map(pos);

			if (type === typeToDelete) {
				tr.delete(adjustedPos, adjustedPos + node.nodeSize);
			} else {
				tr.setNodeMarkup(adjustedPos, undefined, {
					...node.attrs,
					suggestion: null
				});
			}
		}

		dispatch(tr);
		return true;
	};
};

export const acceptSuggestionsInRange = (from: number, to: number): Command => {
	return processSuggestionsInRange('accept', from, to);
};

export const rejectSuggestionsInRange = (from: number, to: number): Command => {
	return processSuggestionsInRange('reject', from, to);
};

export const acceptAllSuggestions: Command = (state, dispatch) => {
	return acceptSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};

export const rejectAllSuggestions: Command = (state, dispatch) => {
	return rejectSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};

const findUserSuggestions = (state: EditorState, username: string): MarkedRange[] => {
	const markRanges = new Map<Mark, { from: number; to: number }>();

	state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
		node.marks.forEach((mark) => {
			if ((mark.type.name === 'suggestion_insert' || mark.type.name === 'suggestion_delete') && mark.attrs.username === username) {
				const range = markRanges.get(mark) || { from: pos, to: pos };
				range.from = Math.min(range.from, pos);
				range.to = Math.max(range.to, pos + node.nodeSize);
				markRanges.set(mark, range);
			}
		});
	});

	return Array.from(markRanges.entries()).map(([mark, range]) => ({
		mark,
		from: range.from,
		to: range.to
	}));
};

const findUserNodeSuggestions = (state: EditorState, username: string): NodeSuggestion[] => {
	const results: NodeSuggestion[] = [];

	state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
		const sugg = node.attrs.suggestion;
		if ((sugg?.type === 'insert' || sugg?.type === 'delete') && sugg.username === username) {
			results.push({
				pos,
				node,
				type: sugg.type,
				username: sugg.username || null
			});
		}
	});

	return results;
};

export const acceptUserSuggestions = (username: string): Command => {
	return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
		const markSuggestions = findUserSuggestions(state, username);
		const nodeSuggestions = findUserNodeSuggestions(state, username);
		if ((!markSuggestions.length && !nodeSuggestions.length) || !dispatch) return false;

		const tr = state.tr;
		tr.setMeta(suggestionTransactionKey, { skipSuggestionOperation: true });

		markSuggestions.forEach(({ mark, from: originalFrom, to: originalTo }) => {
			const adjustedFrom = tr.mapping.map(originalFrom);
			const adjustedTo = tr.mapping.map(originalTo);

			if (mark.type.name === 'suggestion_delete') {
				tr.delete(adjustedFrom, adjustedTo);
			} else {
				tr.removeMark(adjustedFrom, adjustedTo, mark.type);
			}
		});

		for (let i = nodeSuggestions.length - 1; i >= 0; i--) {
			const { pos, node, type } = nodeSuggestions[i];
			const adjustedPos = tr.mapping.map(pos);

			if (type === 'delete') {
				tr.delete(adjustedPos, adjustedPos + node.nodeSize);
			} else {
				tr.setNodeMarkup(adjustedPos, undefined, {
					...node.attrs,
					suggestion: null
				});
			}
		}

		dispatch(tr);
		return true;
	};
};

export const rejectUserSuggestions = (username: string): Command => {
	return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
		const markSuggestions = findUserSuggestions(state, username);
		const nodeSuggestions = findUserNodeSuggestions(state, username);
		if ((!markSuggestions.length && !nodeSuggestions.length) || !dispatch) return false;

		const tr = state.tr;
		tr.setMeta(suggestionTransactionKey, { skipSuggestionOperation: true });

		markSuggestions.forEach(({ mark, from: originalFrom, to: originalTo }) => {
			const adjustedFrom = tr.mapping.map(originalFrom);
			const adjustedTo = tr.mapping.map(originalTo);

			if (mark.type.name === 'suggestion_insert') {
				tr.delete(adjustedFrom, adjustedTo);
			} else {
				tr.removeMark(adjustedFrom, adjustedTo, mark.type);
			}
		});

		for (let i = nodeSuggestions.length - 1; i >= 0; i--) {
			const { pos, node, type } = nodeSuggestions[i];
			const adjustedPos = tr.mapping.map(pos);

			if (type === 'insert') {
				tr.delete(adjustedPos, adjustedPos + node.nodeSize);
			} else {
				tr.setNodeMarkup(adjustedPos, undefined, {
					...node.attrs,
					suggestion: null
				});
			}
		}

		dispatch(tr);
		return true;
	};
};
