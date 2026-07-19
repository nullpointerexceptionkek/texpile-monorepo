// The math palette's symbol table, shared by the Visual editor's MathToolbar (which inserts through
// mathlive) and the Source editor's palette (which inserts LaTeX into CodeMirror). One table, so the
// two surfaces can't drift apart.
import type { Component } from 'svelte';
import { Radical, Pi, Sigma, ArrowLeftRight, Braces, Triangle, Grid3x3, LayoutList } from '@lucide/svelte';
import { m } from '$lib/paraglide/messages';

export type SymbolGroup = {
	id: string;
	/** called at render time: this table is module-level, and the locale isn't known yet at module eval. */
	label: () => string;
	icon: Component;
	// displayLatex: separate LaTeX for the button when the insertion LaTeX doesn't render well.
	// tooltip is a function only where it's translated (the environments group renders it as a
	// visible label, not just a hover); plain strings elsewhere are raw LaTeX/symbol names.
	symbols: Array<{ latex: string; tooltip?: string | (() => string); displayLatex?: string }>;
};

/** resolves a symbol's tooltip whether it's a literal or a lazily-translated one. */
export function symbolTooltip(s: { tooltip?: string | (() => string) }): string | undefined {
	return typeof s.tooltip === 'function' ? s.tooltip() : s.tooltip;
}

export const SYMBOL_GROUPS: SymbolGroup[] = [
	{
		id: 'common',
		label: () => m.mathpal_group_common(),
		icon: Radical,
		symbols: [
			{ latex: '\\frac{#@}{#0}', tooltip: 'Fraction', displayLatex: '\\frac{a}{b}' },
			{ latex: '\\sqrt{#0}', tooltip: 'Square root', displayLatex: '\\sqrt{x}' },
			{ latex: '\\sqrt[#?]{#0}', tooltip: 'Nth root', displayLatex: '\\sqrt[n]{x}' },
			{ latex: '^{#?}', tooltip: 'Superscript', displayLatex: 'x^{n}' },
			{ latex: '_{#?}', tooltip: 'Subscript', displayLatex: 'x_{n}' },
			{ latex: '^{#?}_{#?}', tooltip: 'Super & subscript', displayLatex: 'x_{i}^{n}' },
			{ latex: '\\pm', tooltip: 'Plus-minus' },
			{ latex: '\\mp', tooltip: 'Minus-plus' },
			{ latex: '\\times', tooltip: 'Times' },
			{ latex: '\\div', tooltip: 'Division' },
			{ latex: '\\cdot', tooltip: 'Dot product' },
			{ latex: '\\infty', tooltip: 'Infinity' },
			{ latex: '\\frac{1}{#?}', tooltip: 'Reciprocal', displayLatex: '\\frac{1}{x}' },
			{ latex: '\\binom{#?}{#?}', tooltip: 'Binomial', displayLatex: '\\binom{n}{k}' },
			{ latex: '\\left|#?\\right|', tooltip: 'Absolute value', displayLatex: '\\left|x\\right|' },
			{ latex: '\\left(#?\\right)', tooltip: 'Parentheses', displayLatex: '\\left(x\\right)' }
		]
	},
	{
		id: 'greek',
		label: () => m.mathpal_group_greek(),
		icon: Pi,
		symbols: [
			{ latex: '\\alpha', tooltip: 'alpha' },
			{ latex: '\\beta', tooltip: 'beta' },
			{ latex: '\\gamma', tooltip: 'gamma' },
			{ latex: '\\delta', tooltip: 'delta' },
			{ latex: '\\epsilon', tooltip: 'epsilon' },
			{ latex: '\\zeta', tooltip: 'zeta' },
			{ latex: '\\eta', tooltip: 'eta' },
			{ latex: '\\theta', tooltip: 'theta' },
			{ latex: '\\iota', tooltip: 'iota' },
			{ latex: '\\kappa', tooltip: 'kappa' },
			{ latex: '\\lambda', tooltip: 'lambda' },
			{ latex: '\\mu', tooltip: 'mu' },
			{ latex: '\\nu', tooltip: 'nu' },
			{ latex: '\\xi', tooltip: 'xi' },
			{ latex: '\\omicron', tooltip: 'omicron' },
			{ latex: '\\pi', tooltip: 'pi' },
			{ latex: '\\rho', tooltip: 'rho' },
			{ latex: '\\sigma', tooltip: 'sigma' },
			{ latex: '\\tau', tooltip: 'tau' },
			{ latex: '\\upsilon', tooltip: 'upsilon' },
			{ latex: '\\phi', tooltip: 'phi' },
			{ latex: '\\chi', tooltip: 'chi' },
			{ latex: '\\psi', tooltip: 'psi' },
			{ latex: '\\omega', tooltip: 'omega' },
			{ latex: '\\Gamma', tooltip: 'Gamma' },
			{ latex: '\\Delta', tooltip: 'Delta' },
			{ latex: '\\Theta', tooltip: 'Theta' },
			{ latex: '\\Lambda', tooltip: 'Lambda' },
			{ latex: '\\Xi', tooltip: 'Xi' },
			{ latex: '\\Pi', tooltip: 'Pi' },
			{ latex: '\\Sigma', tooltip: 'Sigma' },
			{ latex: '\\Upsilon', tooltip: 'Upsilon' },
			{ latex: '\\Phi', tooltip: 'Phi' },
			{ latex: '\\Psi', tooltip: 'Psi' },
			{ latex: '\\Omega', tooltip: 'Omega' }
		]
	},
	{
		id: 'calculus',
		label: () => m.mathpal_group_calculus(),
		icon: Sigma,
		symbols: [
			{ latex: '\\int', tooltip: 'Integral' },
			{ latex: '\\int_{#?}^{#?}', tooltip: 'Definite integral', displayLatex: '\\int_{a}^{b}' },
			{ latex: '\\int_{#?}^{#?} #? \\, d#?', tooltip: 'Integral with bounds & function', displayLatex: '\\int_{a}^{b} f(x) \\, dx' },
			{ latex: '\\iint', tooltip: 'Double integral' },
			{ latex: '\\iint_{#?} #? \\, dA', tooltip: 'Double integral with region', displayLatex: '\\iint_{R} f \\, dA' },
			{ latex: '\\iiint', tooltip: 'Triple integral' },
			{ latex: '\\oint', tooltip: 'Contour integral' },
			{ latex: '\\oint_{#?} #? \\, d#?', tooltip: 'Contour integral', displayLatex: '\\oint_{C} f \\, dz' },
			{ latex: '\\sum', tooltip: 'Sum' },
			{ latex: '\\sum_{#?}^{#?}', tooltip: 'Sum with bounds', displayLatex: '\\sum_{i}^{n}' },
			{ latex: '\\prod', tooltip: 'Product' },
			{ latex: '\\prod_{#?}^{#?}', tooltip: 'Product with bounds', displayLatex: '\\prod_{i}^{n}' },
			{ latex: '\\lim', tooltip: 'Limit' },
			{ latex: '\\lim_{#? \\to #?}', tooltip: 'Limit with arrow', displayLatex: '\\lim_{x \\to 0}' },
			{ latex: '\\partial', tooltip: 'Partial derivative' },
			{ latex: '\\frac{\\partial #?}{\\partial #?}', tooltip: 'Partial deriv', displayLatex: '\\frac{\\partial f}{\\partial x}' },
			{ latex: '\\nabla', tooltip: 'Nabla/Del' },
			{ latex: '\\mathrm{d}', tooltip: 'Differential d' }
		]
	},
	{
		id: 'relations',
		label: () => m.mathpal_group_relations(),
		icon: ArrowLeftRight,
		symbols: [
			{ latex: '=', tooltip: 'Equals' },
			{ latex: '\\ne', tooltip: 'Not equal' },
			{ latex: '\\approx', tooltip: 'Approximately' },
			{ latex: '\\equiv', tooltip: 'Equivalent' },
			{ latex: '<', tooltip: 'Less than' },
			{ latex: '>', tooltip: 'Greater than' },
			{ latex: '\\le', tooltip: 'Less or equal' },
			{ latex: '\\ge', tooltip: 'Greater or equal' },
			{ latex: '\\ll', tooltip: 'Much less' },
			{ latex: '\\gg', tooltip: 'Much greater' },
			{ latex: '\\propto', tooltip: 'Proportional' },
			{ latex: '\\sim', tooltip: 'Similar' },
			{ latex: '\\leftrightarrow', tooltip: 'Bidirectional' },
			{ latex: '\\Leftrightarrow', tooltip: 'If and only if', displayLatex: 'A \\Leftrightarrow B' },
			{ latex: '\\rightarrow', tooltip: 'Right arrow' },
			{ latex: '\\leftarrow', tooltip: 'Left arrow' }
		]
	},
	{
		id: 'sets',
		label: () => m.mathpal_group_sets(),
		icon: Braces,
		symbols: [
			{ latex: '\\in', tooltip: 'Element of' },
			{ latex: '\\notin', tooltip: 'Not element of' },
			{ latex: '\\subset', tooltip: 'Subset' },
			{ latex: '\\subseteq', tooltip: 'Subset or equal' },
			{ latex: '\\cup', tooltip: 'Union' },
			{ latex: '\\cap', tooltip: 'Intersection' },
			{ latex: '\\emptyset', tooltip: 'Empty set' },
			{ latex: '\\mathbb{R}', tooltip: 'Real numbers' },
			{ latex: '\\mathbb{N}', tooltip: 'Natural numbers' },
			{ latex: '\\mathbb{Z}', tooltip: 'Integers' },
			{ latex: '\\mathbb{Q}', tooltip: 'Rationals' },
			{ latex: '\\mathbb{C}', tooltip: 'Complex numbers' }
		]
	},
	{
		id: 'trig',
		label: () => m.mathpal_group_trig(),
		icon: Triangle,
		symbols: [
			{ latex: '\\sin', tooltip: 'Sine' },
			{ latex: '\\sin(#?)', tooltip: 'Sine of angle', displayLatex: '\\sin(x)' },
			{ latex: '\\cos', tooltip: 'Cosine' },
			{ latex: '\\cos(#?)', tooltip: 'Cosine of angle', displayLatex: '\\cos(x)' },
			{ latex: '\\tan', tooltip: 'Tangent' },
			{ latex: '\\tan(#?)', tooltip: 'Tangent of angle', displayLatex: '\\tan(x)' },
			{ latex: '\\cot', tooltip: 'Cotangent' },
			{ latex: '\\sec', tooltip: 'Secant' },
			{ latex: '\\csc', tooltip: 'Cosecant' },
			{ latex: '\\arcsin', tooltip: 'Arc sine' },
			{ latex: '\\sin^{-1}(#?)', tooltip: 'sin^-1(x)', displayLatex: '\\sin^{-1}(x)' },
			{ latex: '\\arccos', tooltip: 'Arc cosine' },
			{ latex: '\\cos^{-1}(#?)', tooltip: 'cos^-1(x)', displayLatex: '\\cos^{-1}(x)' },
			{ latex: '\\arctan', tooltip: 'Arc tangent' },
			{ latex: '\\tan^{-1}(#?)', tooltip: 'tan^-1(x)', displayLatex: '\\tan^{-1}(x)' },
			{ latex: '\\ln', tooltip: 'Natural log' },
			{ latex: '\\log', tooltip: 'Logarithm' },
			{ latex: '\\exp', tooltip: 'Exponential' }
		]
	},
	{
		id: 'matrices',
		label: () => m.mathpal_group_matrix(),
		icon: Grid3x3,
		symbols: [
			{
				latex: '\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}',
				tooltip: '2×2 matrix (parens)',
				displayLatex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}'
			},
			{
				latex: '\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}',
				tooltip: '2×2 matrix (brackets)',
				displayLatex: '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}'
			},
			{ latex: '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}', tooltip: 'Column vector', displayLatex: '\\begin{pmatrix}a\\\\b\\end{pmatrix}' },
			{ latex: 'I', tooltip: 'Identity matrix', displayLatex: 'I' },
			{
				latex: '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}',
				tooltip: 'Determinant',
				displayLatex: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}'
			},
			{ latex: '^{T}', tooltip: 'Transpose', displayLatex: 'A^{T}' },
			{ latex: '^{-1}', tooltip: 'Inverse', displayLatex: 'A^{-1}' },
			{ latex: '\\det', tooltip: 'Determinant' },
			{ latex: '\\mathrm{tr}', tooltip: 'Trace' },
			{ latex: '\\vec{#@}', tooltip: 'Vector', displayLatex: '\\vec{v}' },
			{ latex: '\\hat{#@}', tooltip: 'Unit vector', displayLatex: '\\hat{v}' },
			{ latex: '\\cdots', tooltip: 'Horizontal dots' },
			{ latex: '\\vdots', tooltip: 'Vertical dots' },
			{ latex: '\\ddots', tooltip: 'Diagonal dots' },
			{ latex: '\\times', tooltip: 'Cross product' }
		]
	},
	{
		id: 'science',
		label: () => m.mathpal_group_science(),
		icon: Sigma,
		symbols: [
			{ latex: '\\rightarrow', tooltip: 'Reaction arrow (forward)' },
			{ latex: '\\leftarrow', tooltip: 'Reaction arrow (reverse)' },
			{ latex: '\\rightleftharpoons', tooltip: 'Equilibrium arrow' },
			{ latex: '\\Leftrightarrow', tooltip: 'Reversible reaction', displayLatex: 'A \\Leftrightarrow B' },
			{ latex: '\\hbar', tooltip: 'Reduced Planck constant' },
			{ latex: '\\mu', tooltip: 'Micro/Magnetic moment' },
			{ latex: '\\nu', tooltip: 'Frequency/Neutrino' },
			{ latex: '\\omega', tooltip: 'Angular frequency' },
			{ latex: '\\Omega', tooltip: 'Ohms (resistance)' },
			{ latex: '\\degree', tooltip: 'Degrees' },
			{ latex: '\\alpha', tooltip: 'Alpha decay' },
			{ latex: '\\beta', tooltip: 'Beta decay' },
			{ latex: '\\gamma', tooltip: 'Gamma ray' },
			{ latex: '\\Delta', tooltip: 'Change/Delta' },
			{ latex: '\\Delta #?', tooltip: 'Change in variable', displayLatex: '\\Delta x' },
			{ latex: '\\approx', tooltip: 'Approximately equal' },
			{ latex: '\\propto', tooltip: 'Proportional to' },
			{ latex: '\\ll', tooltip: 'Much less than' },
			{ latex: '\\gg', tooltip: 'Much greater than' },
			{ latex: '\\infty', tooltip: 'Infinity' }
		]
	},
	{
		id: 'environments',
		label: () => m.mathpal_group_envs(),
		icon: LayoutList,
		symbols: [
			{
				latex: '\\begin{cases}#? & #? \\\\ #? & #?\\end{cases}',
				tooltip: () => m.mathpal_env_cases(),
				displayLatex: '\\begin{cases}a & x>0 \\\\ b & x\\le0\\end{cases}'
			},
			{
				latex: '\\begin{dcases}#? & #? \\\\ #? & #?\\end{dcases}',
				tooltip: () => m.mathpal_env_dcases(),
				displayLatex: '\\begin{dcases}a & x>0 \\\\ b & x\\le0\\end{dcases}'
			},
			{
				latex: '\\begin{rcases}#? \\\\ #?\\end{rcases}',
				tooltip: () => m.mathpal_env_rcases(),
				displayLatex: '\\begin{rcases}a \\\\ b\\end{rcases}'
			},
			{
				latex: '\\begin{gathered}#? \\\\ #?\\end{gathered}',
				tooltip: () => m.mathpal_env_gathered(),
				displayLatex: '\\begin{gathered}a \\\\ b\\end{gathered}'
			},
			{
				latex: '\\begin{aligned}#? &= #? \\\\ #? &= #?\\end{aligned}',
				tooltip: () => m.mathpal_env_aligned(),
				displayLatex: '\\begin{aligned}a &= b \\\\ c &= d\\end{aligned}'
			},
			{
				latex: '\\begin{split}#? &= #? \\\\ &= #?\\end{split}',
				tooltip: () => m.mathpal_env_split(),
				displayLatex: '\\begin{split}a &= b \\\\ &= c\\end{split}'
			}
		]
	}
];

/** the bracket styles the matrix builder offers, shared by both palettes. */
export const MATRIX_BRACKETS = [
	{ mode: 'matrix', label: '···', title: () => m.mathpal_matrix_no_delimiters() },
	{ mode: 'pmatrix', label: '( )', title: () => m.mathpal_matrix_parentheses() },
	{ mode: 'bmatrix', label: '[ ]', title: () => m.mathpal_matrix_brackets() },
	{ mode: 'Bmatrix', label: '{ }', title: () => m.mathpal_matrix_braces() },
	{ mode: 'vmatrix', label: '| |', title: () => m.mathpal_matrix_single_bars() },
	{ mode: 'Vmatrix', label: '‖ ‖', title: () => m.mathpal_matrix_double_bars() }
] as const;

export type MatrixBracket = (typeof MATRIX_BRACKETS)[number]['mode'];

export function generateMatrixLatex(rows: number, cols: number, bracketMode: string = 'pmatrix'): string {
	let latex = `\\begin{${bracketMode}}`;
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			latex += '#?';
			// spaced: mathlive re-serializes this away, but in source the row is read as written
			if (c < cols - 1) latex += ' & ';
		}
		if (r < rows - 1) latex += '\\\\';
	}
	latex += `\\end{${bracketMode}}`;
	return latex;
}

// mathlive marks holes with #? (placeholder), #@ (selection) and #0. CodeMirror wants ${n} tab
// stops. Only "${" and "#{" start a field there, so LaTeX's own braces pass through untouched.
export function toCmSnippet(latex: string): string {
	let n = 0;
	return latex.replace(/#[?@0]/g, () => `\${${++n}}`);
}

// a row-per-line environment, e.g. \begin{pmatrix}a&b\\c&d\end{pmatrix}
const ROW_ENV = /^\\begin\{([^}]+)\}([\s\S]*)\\end\{\1\}$/;

/**
 * Break a multi-row environment over lines, the way someone would write it by hand. The palette's
 * LaTeX is authored on one line because mathlive re-renders it anyway, but in source that one line
 * IS the document. Rows are kept verbatim so `&=` alignment survives; anything without \\ rows (a
 * bare \alpha, a \frac) is returned untouched. Leading tabs become the editor's indent unit when
 * CodeMirror instantiates the snippet.
 */
export function toSourceBlock(latex: string): string {
	const m = ROW_ENV.exec(latex);
	if (!m) return latex;
	const [, env, body] = m;
	const rows = body.split('\\\\').map((r) => r.trim());
	if (rows.length < 2) return latex; // single row reads fine inline
	return `\\begin{${env}}\n${rows.map((r) => `\t${r}`).join(' \\\\\n')}\n\\end{${env}}`;
}
