// input rules: --- becomes an em dash, -- an en dash, skipped in code blocks
import { InputRule } from 'prosemirror-inputrules';
import type { EditorState, Transaction } from 'prosemirror-state';

function makeDashRule(pattern: RegExp, replacement: string) {
	return new InputRule(pattern, (state: EditorState, _match: RegExpExecArray, start: number, end: number): Transaction | null => {
		const { $from } = state.selection;
		if ($from.parent?.type?.name === 'code_block') return null;
		const tr = state.tr.insertText(replacement, start, end);
		return tr;
	});
}

// order matters: the em dash rule must run before the en dash rule
export const emDashRule = makeDashRule(/---$/, '—');
export const enDashRule = makeDashRule(/--$/, '–');

// typing another - after an auto en dash upgrades it to an em dash
export const emDashUpgradeRule = makeDashRule(/\u2013-$/, '—');
