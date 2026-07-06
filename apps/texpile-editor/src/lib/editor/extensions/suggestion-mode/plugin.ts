// records edits as suggestion_insert/suggestion_delete marks instead of applying them directly

import { Plugin, Transaction, EditorState, type Selection } from 'prosemirror-state';
import type { Node as PmNode, NodeType } from 'prosemirror-model';
import { ReplaceStep, AddMarkStep, RemoveMarkStep, ReplaceAroundStep, Transform, Mapping } from 'prosemirror-transform';
import { type SuggestionModePluginState, suggestionPluginKey, suggestionTransactionKey } from './key';
import { findNonStartingPos } from './helpers/nodePosition';

type AnyStep = ReplaceStep | AddMarkStep | RemoveMarkStep | ReplaceAroundStep;

/** non-markable nodes carry a suggestion attr instead of marks. */
function hasSuggestionAttr(nodeType: NodeType): boolean {
	return nodeType.spec.attrs?.suggestion !== undefined;
}

function setSuggestionAttrsInRange(tr: Transaction, from: number, to: number, type: 'insert' | 'delete', username: string | null): void {
	const positions: { pos: number; node: PmNode }[] = [];
	tr.doc.nodesBetween(from, to, (node, pos) => {
		if (hasSuggestionAttr(node.type) && node.attrs.suggestion === null) {
			positions.push({ pos, node });
		}
	});
	for (let i = positions.length - 1; i >= 0; i--) {
		const { pos, node } = positions[i];
		tr.setNodeMarkup(pos, undefined, {
			...node.attrs,
			suggestion: { type, username }
		});
	}
}

function isReplaceStep(step: AnyStep): step is ReplaceStep {
	return 'slice' in step && !('gapFrom' in step);
}

function isReplaceAroundStep(step: AnyStep): step is ReplaceAroundStep {
	return 'slice' in step && 'gapFrom' in step && 'gapTo' in step;
}

export interface SuggestionModePluginOptions {
	inSuggestionMode?: boolean;
}

export const suggestionModePlugin = (options: SuggestionModePluginOptions = {}) => {
	return new Plugin({
		key: suggestionPluginKey,

		appendTransaction(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) {
			const pluginState = this.getState(oldState);

			const tr = newState.tr;
			let changed = false;

			const intermediateTr = new Transform(oldState.doc);
			let lastStep: AnyStep | null = null;

			transactions.forEach((transaction, trIndex) => {
				// skip undo/redo history transactions
				if (transaction.getMeta('history$')) return;
				// skip y.js sync transactions
				if (transaction.getMeta('y-sync$')) return;
				if (transaction.getMeta('yjs')) return;

				const transactionMeta = transaction.getMeta(suggestionTransactionKey);
				const meta = {
					...pluginState,
					...transactionMeta
				};

				if (!meta.inSuggestionMode) return;
				if (meta.skipSuggestionOperation) return;

				const markAttrs = meta.username ? { username: meta.username } : {};

				transaction.steps.forEach((step: AnyStep, stepIndex: number) => {
					if (lastStep) intermediateTr.step(lastStep);
					lastStep = step;

					const removedSlice = intermediateTr.doc.slice(step.from, step.to, false);

					let addedSliceSize = isReplaceStep(step) ? step.slice.size : removedSlice.size;

					if (isReplaceAroundStep(step)) {
						addedSliceSize = step.gapTo - step.gapFrom + step.slice.size;
					}

					tr.setMeta(suggestionTransactionKey, {
						skipSuggestionOperation: true
					});

					const $pos = intermediateTr.doc.resolve(step.from);
					const marksAtPos = $pos.marks();
					const existingSuggestionMark = marksAtPos.find((m) => m.type.name === 'suggestion_insert' || m.type.name === 'suggestion_delete');
					let from = step.from;
					if (existingSuggestionMark) {
						if (addedSliceSize > 1) {
							tr.addMark(from, from + addedSliceSize, existingSuggestionMark);
							changed = true;
						}
						return;
					}

					if (removedSlice.size > 0) {
						// delete: re-insert the removed content with a suggestion_delete mark

						const isBackspace =
							(isReplaceStep(step) || isReplaceAroundStep(step)) && step.slice.size === 0 && newState.selection.from === step.from;

						const mapToNewDocPos: Mapping = transactions.slice(trIndex).reduce((acc, txn, i) => {
							const startStep = i === 0 ? stepIndex : 0;
							txn.steps.slice(startStep).forEach((s) => {
								acc.appendMap(s.getMap());
							});
							return acc;
						}, new Mapping());

						from = mapToNewDocPos.map(step.from);
						from = tr.mapping.map(from);

						const $from = tr.doc.resolve(from);
						from = findNonStartingPos($from);

						if (removedSlice.openEnd + removedSlice.openStart > 0) {
							let currentPos = 0;
							const pilcrowPositions: number[] = [];
							removedSlice.content.forEach((node, offset, index) => {
								if (index >= removedSlice.content.childCount - removedSlice.openEnd) return;
								if (node.isBlock) {
									pilcrowPositions.push(currentPos + node.nodeSize - 2);
								}
								currentPos += node.nodeSize;
							});

							tr.replace(from, from, removedSlice);

							let extraChars = 0;
							pilcrowPositions.forEach((pos) => {
								tr.insertText('\u00B6', from + pos + extraChars);
								extraChars += 1;
							});

							const endsWithText = removedSlice.content.lastChild?.textContent.length > 0;
							if (removedSlice.openEnd > 0 && !endsWithText) {
								tr.insertText('\u200B', from + currentPos + extraChars);
								extraChars += 1;
							}

							tr.addMark(from, from + removedSlice.size + extraChars, newState.schema.marks.suggestion_delete.create(markAttrs));
							setSuggestionAttrsInRange(tr, from, from + removedSlice.size + extraChars, 'delete', markAttrs.username || null);
						} else {
							tr.replace(from, from, removedSlice);
							tr.addMark(from, from + removedSlice.size, newState.schema.marks.suggestion_delete.create(markAttrs));
							setSuggestionAttrsInRange(tr, from, from + removedSlice.size, 'delete', markAttrs.username || null);
						}

						if (isBackspace) {
							// recreate a selection of the same concrete subclass at the new position: the abstract
							// Selection base has no shared static create, so narrow to the 2-arg shape the subclasses implement
							const SelectionCtor = tr.selection.constructor as unknown as { create(doc: PmNode, pos: number): Selection };
							tr.setSelection(SelectionCtor.create(tr.doc, from));
						}

						changed = true;
					}

					if (addedSliceSize > 0) {
						const addedFrom = from + removedSlice.size;
						const addedTo = addedFrom + addedSliceSize;

						tr.addMark(addedFrom, addedTo, newState.schema.marks.suggestion_insert.create(markAttrs));
						setSuggestionAttrsInRange(tr, addedFrom, addedTo, 'insert', markAttrs.username || null);
						changed = true;
					}
				});
			});

			return changed ? tr : null;
		},

		state: {
			init(): SuggestionModePluginState {
				return {
					inSuggestionMode: options.inSuggestionMode || false
				};
			},

			apply(tr: Transaction, value: SuggestionModePluginState): SuggestionModePluginState {
				const meta = tr.getMeta(suggestionPluginKey);
				if (meta) {
					return { ...value, ...meta };
				}
				return value;
			}
		}
	});
};
