import { describe, it, expect } from 'vitest';
import { latexToProseMirror } from '../../../../src/lib/latex-parser/converter';
import { serializeToLatex } from '$lib/serializer/latexSerializer';
import { parseLatexFile, serializeLatexFile } from '$lib/workspace/latexRoundtrip';

// regression guard: figure*/table* were missing from envHandlers, so a lone \includegraphics
// inside figure* got promoted to a plain image node with no figureTemplate and serialized via
// the synthetic single-figure fallback: wrong (unstarred) environment, illegal nesting inside
// \begin{center} ("Not in outer par mode"), real \caption dropped. byte-level round-trip checks
// can't see this because the `orig` verbatim layer masks untouched saves; it only surfaces once
// the block regenerates. corpus repro: 1810.04805/related.tex.
describe('figure* / table* starred float variants', () => {
	const REAL_CAPTION = 'Overall pre-training and fine-tuning procedure.';
	const src = `\\begin{figure*}[t!]
\\begin{center}
\\includegraphics[width=1\\textwidth]{BERT_Overall.pdf}
\\end{center}
\\caption{${REAL_CAPTION}}
\\label{fig:bert_overall}
\\end{figure*}`;

	it('models a lone image inside figure* as an editable image node (not a raw/generic environment)', () => {
		const { doc } = latexToProseMirror(src, {});
		expect(doc.childCount).toBe(1);
		expect(doc.child(0).type.name).toBe('image');
	});

	// byte-identity is a property of the real pipeline (parseLatexFile/serializeLatexFile and its
	// `orig` verbatim mechanism), not the raw converter/serializer: figureTemplate re-prints the
	// AST, valid but not byte-exact. that is why this file's bug was invisible to the earlier
	// byte-fidelity corpus sweep, which only exercised the untouched-save path.
	it('round-trips figure* byte-identically on an untouched save (real app pipeline)', () => {
		const file = `\\documentclass{article}\n\\begin{document}\n${src}\n\\end{document}\n`;
		const parsed = parseLatexFile(file);
		expect(serializeLatexFile(parsed, parsed.doc)).toBe(file);
	});

	// latexToProseMirror alone never fills `orig.norm` (only parseLatexFile does), so this doc
	// always serializes through the deterministic path, the exact path the pre-fix bug broke on
	// any real edit
	it('serializes a starred, correctly-nested, caption-preserving figure* through the deterministic path', () => {
		const { doc } = latexToProseMirror(src, {});
		const img = doc.child(0);
		// simulate an in-editor caption edit, the shape a real ProseMirror transaction produces
		const edited = img.type.create(img.attrs, img.type.schema.text('New caption text'));
		const out = serializeToLatex(doc.copy(doc.content.replaceChild(0, edited)));

		expect(out).toContain('\\begin{figure*}');
		expect(out).toContain('\\end{figure*}');
		// must not synthesize a nested unstarred float, the invalid-LaTeX regression
		expect(out).not.toMatch(/\\begin\{figure\}(?!\*)/);
		expect(out).toContain('New caption text');
	});

	it('preserves the real caption text through the deterministic path (no content loss)', () => {
		const { doc } = latexToProseMirror(src, {});
		const out = serializeToLatex(doc);
		expect(out).toContain(REAL_CAPTION);
	});

	it('models a lone table inside table* as an editable table_wrapper (not a raw/generic environment)', () => {
		const tableSrc = `\\begin{table*}[t]
\\centering
\\begin{tabular}{ll}
a & b \\\\
\\end{tabular}
\\caption{A wide table.}
\\label{tab:wide}
\\end{table*}`;
		const { doc } = latexToProseMirror(tableSrc, {});
		expect(doc.childCount).toBe(1);
		expect(doc.child(0).type.name).toBe('table_wrapper');
		expect(serializeToLatex(doc)).toContain('\\begin{table*}');
	});

	// same bug class as figure*, for wrapfig's text-wrapping float: a lone \includegraphics
	// inside \begin{wrapfigure} synthesized an illegally-nested \begin{figure}[h] and dropped the
	// caption (corpus repros: 1409.0473, 1606.08415, 1910.01108). wraptable is deliberately not
	// fixed the same way, see the `wrapfigure` envHandlers entry in converter.ts.
	// \caption[short]{long}: the slot mechanism replaces the whole \caption macro, so the
	// optional short caption vanished and the caption package's scanner then dies on the first
	// bracket-less \caption (corpus repro: 2001.08361).
	it('preserves the \\caption[short] optional argument through the deterministic path', () => {
		const capSrc = `\\begin{figure}[t]
\\centering
\\includegraphics[width=\\textwidth]{plot.pdf}
\\caption[Summary of simple power laws.]{Language modeling performance improves smoothly.}
\\label{fig:power}
\\end{figure}`;
		const { doc } = latexToProseMirror(capSrc, {});
		const out = serializeToLatex(doc);
		expect(out).toContain('\\caption[Summary of simple power laws.]{Language modeling performance improves smoothly.}');
	});

	// a longtable with repeating-header markers (\endfirsthead/\endhead/\endfoot) is unmodelable
	// as a grid: markers got garbled into cell text and the colspec leaked into the body (corpus
	// repro: 2203.02155). such longtables demote to a verbatim raw block; marker-less ones stay
	// editable.
	it('preserves a longtable with \\endhead markers verbatim', () => {
		const ltSrc = `\\begin{longtable}{p{.2\\textwidth} p{.8\\textwidth}}
\\toprule
Use Case & Example \\\\
\\midrule
\\endfirsthead
Use Case & Example \\\\
\\midrule
\\endhead
brainstorming & baby names \\\\
\\end{longtable}`;
		const { doc } = latexToProseMirror(ltSrc, {});
		expect(doc.child(0).type.name).toBe('raw_latex');
		const out = serializeToLatex(doc);
		expect(out).toContain('\\begin{longtable}{p{.2\\textwidth} p{.8\\textwidth}}');
		expect(out).toContain('\\endfirsthead');
		expect(out).toContain('\\endhead');
	});

	it('a marker-less longtable still becomes an editable table', () => {
		const ltSrc = `\\begin{longtable}{ll}
a & b \\\\
c & d \\\\
\\end{longtable}`;
		const { doc } = latexToProseMirror(ltSrc, {});
		expect(doc.child(0).type.name).not.toBe('raw_latex');
	});

	it('models a lone image inside wrapfigure as an editable image node with a verbatim template', () => {
		const wrapSrc = `\\begin{wrapfigure}{r}{0.58\\textwidth}
\\centering
\\includegraphics[width=0.55\\textwidth]{nonlinearity-plot}
\\caption{The GELU activation.}
\\label{fig:nonlinearityplot}
\\end{wrapfigure}`;
		const { doc } = latexToProseMirror(wrapSrc, {});
		expect(doc.childCount).toBe(1);
		expect(doc.child(0).type.name).toBe('image');
		const out = serializeToLatex(doc);
		expect(out).toContain('\\begin{wrapfigure}{r}{0.58\\textwidth}');
		expect(out).toContain('\\end{wrapfigure}');
		expect(out).toContain('The GELU activation.');
		// must not synthesize a nested float inside wrapfigure, the invalid-LaTeX regression
		expect(out).not.toMatch(/\\begin\{figure\}/);
	});
});
