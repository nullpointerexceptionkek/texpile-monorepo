// parse/generate the tabular colspec mini-language ({|l|c|p{3cm}|}) for the visual column editor.
// only the simple subset is modelled; anything exotic makes parseColspec return null so the UI
// falls back to editing the verbatim string. nothing is ever silently dropped.
export type ColAlign = 'l' | 'c' | 'r' | 'p' | 'm' | 'b' | 'X' | 'C';

export interface ColspecColumn {
	align: ColAlign;
	width?: string; // for p/m/b
}

export interface ColspecModel {
	columns: ColspecColumn[];
	rules: boolean[]; // length === columns.length + 1; rules[i] = a `|` before column i; last = after
}

const SIMPLE_ALIGN = new Set(['l', 'c', 'r', 'X', 'C']);
const PARAGRAPH_ALIGN = new Set(['p', 'm', 'b']);

export function parseColspec(spec: string): ColspecModel | null {
	const columns: ColspecColumn[] = [];
	const rules: boolean[] = [];
	let pendingRule = false;
	let i = 0;
	while (i < spec.length) {
		const ch = spec[i];
		if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
			i++;
			continue;
		}
		if (ch === '|') {
			pendingRule = true;
			i++;
			continue;
		}
		if (SIMPLE_ALIGN.has(ch)) {
			rules.push(pendingRule);
			pendingRule = false;
			columns.push({ align: ch as ColAlign });
			i++;
			continue;
		}
		if (PARAGRAPH_ALIGN.has(ch)) {
			let j = i + 1;
			while (spec[j] === ' ') j++;
			if (spec[j] !== '{') return null; // p/m/b must be followed by {width}
			let depth = 0;
			let width = '';
			let k = j;
			for (; k < spec.length; k++) {
				const c = spec[k];
				if (c === '{') {
					depth++;
					if (depth === 1) continue;
				} else if (c === '}') {
					depth--;
					if (depth === 0) {
						k++;
						break;
					}
				}
				width += c;
			}
			if (depth !== 0) return null; // unbalanced braces
			rules.push(pendingRule);
			pendingRule = false;
			columns.push({ align: ch as ColAlign, width });
			i = k;
			continue;
		}
		return null; // not modelled: >{} @{} !{} *{} S(...) parens etc.
	}
	rules.push(pendingRule); // trailing rule after the last column
	return { columns, rules };
}

export function generateColspec(model: ColspecModel): string {
	let out = '';
	model.columns.forEach((col, i) => {
		if (model.rules[i]) out += '|';
		out += PARAGRAPH_ALIGN.has(col.align) ? `${col.align}{${col.width ?? ''}}` : col.align;
	});
	if (model.rules[model.columns.length]) out += '|';
	return out;
}
