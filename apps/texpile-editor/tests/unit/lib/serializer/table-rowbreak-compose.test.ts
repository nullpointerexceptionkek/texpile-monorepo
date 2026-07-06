import { describe, it, expect } from 'vitest';
import type { Node } from 'prosemirror-model';
import * as LatexParser from '$lib/latex-parser';
import { serializeToLatex } from '../../../../src/lib/serializer/latexSerializer';

const parse = (s: string): Node => LatexParser.latexToProseMirror(s, {}).doc;
const rt = (s: string) => serializeToLatex(parse(s));
function count(doc: Node, type: string): number {
	let n = 0;
	doc.descendants((x) => {
		if (x.type.name === type) n++;
		return true;
	});
	return n;
}
function has(doc: Node, type: string): boolean {
	return count(doc, type) > 0;
}

describe('tabular row breaks (\\\\) are recognised', () => {
	it('rows split on \\\\ ending a line (newline-trailing)', () => {
		const doc = parse(String.raw`\begin{tabular}{cc}
a & b \\
c & d \\
\end{tabular}`);
		expect(count(doc, 'table_row')).toBe(2);
	});

	it('rows split on \\\\ followed by a space on the same line (\\\\ \\hline)', () => {
		const doc = parse(String.raw`\begin{tabular}{cc}r1a & r1b \\ \hline r2a & r2b \\ \end{tabular}`);
		expect(count(doc, 'table_row')).toBe(2);
	});

	// known limitation: unified-latex parses a `\ ` control space to the same macro as a
	// space-trailing `\\`, so a `\ ` inside a cell also reads as a row break. row breaks
	// dominate in tables, so we accept this rare case (documented in isRowBreak).
});

describe('\\rule struts and dividers', () => {
	it('a row-leading \\rule strut is captured with the row rules and round-trips (no compounding)', () => {
		const src = String.raw`\begin{tabular}{cc}
\hline\rule{0pt}{2.0ex}
a & b \\
c & d \\
\hline
\end{tabular}`;
		const once = rt(src);
		expect(once).toContain('\\rule{0pt}{2.0ex}'); // strut kept with its dimensions
		expect(once).not.toContain('\\par\\noindent\\rule'); // not turned into a horizontal_rule
		expect(rt(once)).toBe(once); // fixed point, no brace/par compounding
	});

	it('\\rule{w}{h} keeps its dimensions (not collapsed to a full-width line)', () => {
		expect(rt(String.raw`x \rule{2cm}{1pt} y`)).toContain('\\rule{2cm}{1pt}');
	});

	it("our generator's own \\rule{\\linewidth}{0.4pt} still maps back to a horizontal_rule", () => {
		expect(has(parse(String.raw`\rule{\linewidth}{0.4pt}`), 'horizontal_rule')).toBe(true);
	});
});

describe('center-wrapped table float composes (preserving the original structure)', () => {
	const SRC = String.raw`\begin{table}[t]\caption{Op complexities.}
\label{tab:op} \begin{center}\vspace{-1mm}
\begin{tabular}{lcc}\toprule A & B & C \\ \hline \rule{0pt}{2.0ex}Self-Attention & 1 & 2 \\
Recurrent & 3 & 4 \\
\bottomrule\end{tabular}
\end{center}\end{table}`;

	it('models the nested tabular as a real table inside an environment(center), not raw', () => {
		const doc = parse(SRC);
		expect(has(doc, 'raw_latex')).toBe(false); // not dumped as one raw block
		expect(has(doc, 'table')).toBe(true); // editable table
		expect(count(doc, 'table_row')).toBe(3);
		// the \begin{table} and \begin{center} survive as environment nodes
		let envs = '';
		doc.descendants((n) => {
			if (n.type.name === 'environment') envs += n.attrs.name + ' ';
			return true;
		});
		expect(envs).toContain('table');
		expect(envs).toContain('center');
	});

	it('round-trips to a fixed point and preserves caption / label / center / strut / placement', () => {
		const out = rt(SRC);
		expect(out).toContain('\\begin{table}[t]'); // float placement kept
		expect(out).toContain('\\begin{center}'); // not rewritten to \centering
		expect(out).toContain('\\caption{Op complexities.}');
		expect(out).toContain('\\label{tab:op}');
		expect(out).toContain('\\vspace{-1mm}');
		expect(out).toContain('\\rule{0pt}{2.0ex}');
		expect(rt(out)).toBe(out); // fixed point
	});
});
