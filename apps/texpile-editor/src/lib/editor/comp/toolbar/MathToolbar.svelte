<script lang="ts" module>
	export const mathToolbarState = $state({ aiInputActive: false });
</script>

<script lang="ts">
	import { Popover, Portal } from '@skeletonlabs/skeleton-svelte';
	import {
		Keyboard,
		ChevronDown,
		Radical,
		Pi,
		Sigma,
		ArrowLeftRight,
		Braces,
		Triangle,
		Grid3x3,
		LayoutList,
		BoxSelect
	} from '@lucide/svelte';
	import { editorViewStore } from '$lib/stores/editorStore';
	import { TextSelection } from 'prosemirror-state';
	import { convertLatexToMarkup } from 'mathlive';
	// static.css provides styles for convertLatexToMarkup output (fonts.css already loaded by mlview)
	import 'mathlive/static.css';
	import type { Component } from 'svelte';

	function renderLatex(latex: string): string {
		try {
			return convertLatexToMarkup(latex);
		} catch {
			return latex;
		}
	}

	type SymbolGroup = {
		id: string;
		label: string;
		icon: Component;
		// displayLatex: separate LaTeX for the button when the insertion LaTeX doesn't render well
		symbols: Array<{ latex: string; tooltip?: string; displayLatex?: string }>;
	};

	let activeMathfieldRef: HTMLElement | null = $state(null);
	let savedSelection: { start: number; end: number } | null = $state(null);
	let matrixGridHoverRows = $state(2);
	let matrixGridHoverCols = $state(2);
	let matrixBracketMode = $state<'matrix' | 'pmatrix' | 'bmatrix' | 'Bmatrix' | 'vmatrix' | 'Vmatrix'>('pmatrix');

	// this toolbar only shows while a mathfield is focused, so capture the ref eagerly
	$effect(() => {
		if (document.activeElement instanceof window.MathfieldElement) {
			activeMathfieldRef = document.activeElement;
		}
	});

	let isBlockMath = $derived.by(() => {
		if (!activeMathfieldRef) return false;
		return activeMathfieldRef.closest('.block-math-container') !== null;
	});

	function selectBlockMath() {
		const view = $editorViewStore;
		if (!view || !activeMathfieldRef) return;

		const container = activeMathfieldRef.closest('.block-math-container');
		if (!container) return;

		const pos = view.posAtDOM(container, 0);
		if (pos === null || pos === undefined) return;

		const resolvedPos = view.state.doc.resolve(pos);
		let nodePos = pos;
		let node = view.state.doc.nodeAt(pos);

		// pos lands inside the text content, walk up to the block_math itself
		if (!node || node.type.name !== 'block_math') {
			for (let d = resolvedPos.depth; d > 0; d--) {
				const parentNode = resolvedPos.node(d);
				if (parentNode.type.name === 'block_math') {
					nodePos = resolvedPos.before(d);
					node = parentNode;
					break;
				}
			}
		}

		if (!node || node.type.name !== 'block_math') return;

		const from = nodePos;
		const to = nodePos + node.nodeSize;
		const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to));
		view.dispatch(tr);
		view.focus();
	}

	const symbolGroups: SymbolGroup[] = [
		{
			id: 'common',
			label: 'Common',
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
			label: 'Greek',
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
			label: 'Calculus',
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
			label: 'Relations',
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
			label: 'Sets',
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
			label: 'Trig',
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
			label: 'Matrix',
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
			label: 'Science',
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
			label: 'Envs',
			icon: LayoutList,
			symbols: [
				{
					latex: '\\begin{cases}#? & #? \\\\ #? & #?\\end{cases}',
					tooltip: 'Piecewise (cases)',
					displayLatex: '\\begin{cases}a & x>0 \\\\ b & x\\le0\\end{cases}'
				},
				{
					latex: '\\begin{dcases}#? & #? \\\\ #? & #?\\end{dcases}',
					tooltip: 'Display cases',
					displayLatex: '\\begin{dcases}a & x>0 \\\\ b & x\\le0\\end{dcases}'
				},
				{
					latex: '\\begin{rcases}#? \\\\ #?\\end{rcases}',
					tooltip: 'Right cases',
					displayLatex: '\\begin{rcases}a \\\\ b\\end{rcases}'
				},
				{
					latex: '\\begin{gathered}#? \\\\ #?\\end{gathered}',
					tooltip: 'Gathered (centered)',
					displayLatex: '\\begin{gathered}a \\\\ b\\end{gathered}'
				},
				{
					latex: '\\begin{aligned}#? &= #? \\\\ #? &= #?\\end{aligned}',
					tooltip: 'Aligned columns',
					displayLatex: '\\begin{aligned}a &= b \\\\ c &= d\\end{aligned}'
				},
				{
					latex: '\\begin{split}#? &= #? \\\\ &= #?\\end{split}',
					tooltip: 'Split equation',
					displayLatex: '\\begin{split}a &= b \\\\ &= c\\end{split}'
				}
			]
		}
	];

	let openGroup = $state<string | null>(null);

	// mousedown fires before focus changes, so preventDefault keeps the mathfield focused
	function preventFocusLoss(e: MouseEvent | PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function toggleGroup(groupId: string) {
		// capture the mathfield ref and cursor position before any state changes
		const mf = document.activeElement;
		if (mf instanceof window.MathfieldElement) {
			activeMathfieldRef = mf;
			const sel = mf.selection;
			if (sel && typeof sel === 'object' && 'ranges' in sel) {
				const ranges = sel.ranges;
				if (ranges && ranges.length > 0) {
					savedSelection = { start: ranges[0][0], end: ranges[0][1] };
				}
			} else {
				// fallback: position property
				const pos = mf.position ?? 0;
				savedSelection = { start: pos, end: pos };
			}
		}

		const isClosing = openGroup === groupId;
		openGroup = isClosing ? null : groupId;

		if (isClosing && activeMathfieldRef) {
			setTimeout(() => {
				activeMathfieldRef?.focus();
			}, 0);
		}
	}

	function insertSymbol(latex: string) {
		const mf = activeMathfieldRef;
		const selToRestore = savedSelection;

		if (mf && mf instanceof window.MathfieldElement) {
			openGroup = null;

			// setTimeout so focus happens after the popover closes
			setTimeout(() => {
				mf.focus();
				if (selToRestore) {
					mf.selection = { ranges: [[selToRestore.start, selToRestore.end]] };
				}
				mf.insert(latex, {
					selectionMode: 'placeholder',
					format: 'latex'
				});
			}, 0);
		} else {
			openGroup = null;
		}
	}

	function toggleVirtualKeyboard() {
		if (window.mathVirtualKeyboard?.visible) {
			window.mathVirtualKeyboard.hide();
		} else {
			window.mathVirtualKeyboard.show();
		}
		if (activeMathfieldRef) {
			activeMathfieldRef.focus();
		}
	}

	function generateMatrixLatex(rows: number, cols: number, bracketMode: string = 'pmatrix'): string {
		let latex = `\\begin{${bracketMode}}`;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				latex += '#?';
				if (c < cols - 1) latex += '&';
			}
			if (r < rows - 1) latex += '\\\\';
		}
		latex += `\\end{${bracketMode}}`;
		return latex;
	}

	function insertCustomMatrix(rows: number, cols: number) {
		const latex = generateMatrixLatex(rows, cols, matrixBracketMode);
		openGroup = null;
		insertSymbol(latex);
	}
</script>

<ul class="flex items-center gap-1 sm:gap-1.5 2xl:gap-2">
	{#each symbolGroups as group}
		{@const Icon = group.icon}
		<li>
			<Popover
				open={openGroup === group.id}
				onOpenChange={(e) => {
					// only update when it's not a close triggered by our own insertSymbol
					if (!e.open) {
						openGroup = null;
					}
				}}
				positioning={{ placement: 'bottom-start', offset: { mainAxis: 0 } }}
				autoFocus={false}
			>
				<Popover.Trigger>
					<button
						class="toolbarButton flex items-center gap-1 rounded p-1 hover:preset-tonal"
						class:preset-tonal-primary={openGroup === group.id}
						aria-label={group.label}
						title={group.label}
						tabindex="-1"
						onmousedown={preventFocusLoss}
						onclick={() => toggleGroup(group.id)}
					>
						<Icon class="h-4 w-4" />
						<span class="text-xs">{group.label}</span>
						<ChevronDown class="h-3 w-3 opacity-50" />
					</button>
				</Popover.Trigger>

				<Portal>
					<Popover.Positioner class="z-floating-ui">
						<Popover.Content class="card bg-surface-50-950 border-surface-300-700 min-w-[200px] border shadow-lg">
							<div class="py-1" tabindex="-1" role="presentation" onmousedown={preventFocusLoss}>
								<div class="text-surface-600-400 px-2 py-1 text-xs font-semibold uppercase">{group.label}</div>

								{#if group.id === 'matrices'}
									<div class="border-surface-300 border-b p-3">
										<div class="mb-2 text-xs font-medium">Matrix Style</div>
										<div class="mb-3 flex flex-wrap gap-2">
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'matrix'}
												class:border-blue-400={matrixBracketMode === 'matrix'}
												class:bg-surface-100={matrixBracketMode !== 'matrix'}
												class:border-surface-300={matrixBracketMode !== 'matrix'}
												onclick={() => (matrixBracketMode = 'matrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="No delimiters"
											>
												···
											</button>
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'pmatrix'}
												class:border-blue-400={matrixBracketMode === 'pmatrix'}
												class:bg-surface-100={matrixBracketMode !== 'pmatrix'}
												class:border-surface-300={matrixBracketMode !== 'pmatrix'}
												onclick={() => (matrixBracketMode = 'pmatrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="Parentheses"
											>
												( )
											</button>
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'bmatrix'}
												class:border-blue-400={matrixBracketMode === 'bmatrix'}
												class:bg-surface-100={matrixBracketMode !== 'bmatrix'}
												class:border-surface-300={matrixBracketMode !== 'bmatrix'}
												onclick={() => (matrixBracketMode = 'bmatrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="Brackets"
											>
												[ ]
											</button>
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'Bmatrix'}
												class:border-blue-400={matrixBracketMode === 'Bmatrix'}
												class:bg-surface-100={matrixBracketMode !== 'Bmatrix'}
												class:border-surface-300={matrixBracketMode !== 'Bmatrix'}
												onclick={() => (matrixBracketMode = 'Bmatrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="Braces"
											>
												&#123; &#125;
											</button>
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'vmatrix'}
												class:border-blue-400={matrixBracketMode === 'vmatrix'}
												class:bg-surface-100={matrixBracketMode !== 'vmatrix'}
												class:border-surface-300={matrixBracketMode !== 'vmatrix'}
												onclick={() => (matrixBracketMode = 'vmatrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="Single vertical lines"
											>
												| |
											</button>
											<button
												type="button"
												class="rounded border px-2 py-1 text-xs transition-colors"
												class:preset-tonal-primary={matrixBracketMode === 'Vmatrix'}
												class:border-blue-400={matrixBracketMode === 'Vmatrix'}
												class:bg-surface-100={matrixBracketMode !== 'Vmatrix'}
												class:border-surface-300={matrixBracketMode !== 'Vmatrix'}
												onclick={() => (matrixBracketMode = 'Vmatrix')}
												onmousedown={preventFocusLoss}
												tabindex="-1"
												title="Double vertical lines (norm)"
											>
												‖ ‖
											</button>
										</div>
										<div class="mb-2 text-xs font-medium">Size</div>
										<div class="space-y-2">
											<div class="grid gap-1" style="grid-template-columns: repeat(6, 1fr);">
												{#each Array.from({ length: 6 }) as _, row}
													{#each Array.from({ length: 6 }) as _, col}
														<button
															type="button"
															class="aspect-square w-full rounded border text-xs transition-colors"
															class:preset-tonal-primary={row + 1 <= matrixGridHoverRows && col + 1 <= matrixGridHoverCols}
															class:border-blue-400={row + 1 <= matrixGridHoverRows && col + 1 <= matrixGridHoverCols}
															class:bg-surface-100={!(row + 1 <= matrixGridHoverRows && col + 1 <= matrixGridHoverCols)}
															class:border-surface-300={!(row + 1 <= matrixGridHoverRows && col + 1 <= matrixGridHoverCols)}
															aria-label={`Insert ${row + 1}×${col + 1} matrix`}
															onmouseover={() => {
																matrixGridHoverRows = row + 1;
																matrixGridHoverCols = col + 1;
															}}
															onfocus={() => {
																matrixGridHoverRows = row + 1;
																matrixGridHoverCols = col + 1;
															}}
															onclick={() => insertCustomMatrix(row + 1, col + 1)}
															onmousedown={preventFocusLoss}
															tabindex="-1"
														>
														</button>
													{/each}
												{/each}
											</div>
											<div class="text-surface-600 text-center text-xs font-medium">{matrixGridHoverRows}×{matrixGridHoverCols}</div>
										</div>
									</div>
								{/if}

								{#if group.id === 'environments'}
									<div class="env-list">
										{#each group.symbols as symbol}
											<button
												type="button"
												class="env-btn"
												tabindex="-1"
												onmousedown={preventFocusLoss}
												onclick={() => insertSymbol(symbol.latex)}
												title={symbol.tooltip || symbol.latex}
											>
												<span class="env-label">{symbol.tooltip}</span>
												<span class="env-preview">
													<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderLatex() is mathlive's own trusted math-typesetting HTML for a symbol from the hardcoded symbolGroups table above, never user/network input. -->
													{@html renderLatex(symbol.displayLatex ?? symbol.latex)}
												</span>
											</button>
										{/each}
									</div>
								{:else}
									<div class="symbol-grid" data-group={group.id}>
										{#each group.symbols as symbol}
											<button
												type="button"
												class="symbol-btn"
												tabindex="-1"
												onmousedown={preventFocusLoss}
												onclick={() => insertSymbol(symbol.latex)}
												title={symbol.tooltip || symbol.latex}
											>
												<span class="symbol-content">
													<!-- eslint-disable-next-line svelte/no-at-html-tags -- renderLatex() is mathlive's own trusted math-typesetting HTML for a symbol from the hardcoded symbolGroups table above, never user/network input. -->
													{@html renderLatex(symbol.displayLatex ?? symbol.latex)}
												</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</Popover.Content>
					</Popover.Positioner>
				</Portal>
			</Popover>
		</li>
	{/each}

	<li class="border-surface-300-700 h-6 border-r"></li>

	<li>
		<button
			class="toolbarButton rounded p-1 hover:preset-tonal"
			tabindex="-1"
			onmousedown={preventFocusLoss}
			onclick={toggleVirtualKeyboard}
			aria-label="Toggle virtual keyboard"
			title="Virtual Keyboard"
		>
			<Keyboard class="h-5 w-5" />
		</button>
	</li>

	{#if isBlockMath}
		<li class="border-surface-300-700 h-6 border-r"></li>
		<li>
			<button
				class="toolbarButton rounded p-1 hover:preset-tonal"
				tabindex="-1"
				onmousedown={preventFocusLoss}
				onclick={selectBlockMath}
				aria-label="Select block"
				title="Select equation block"
			>
				<BoxSelect class="h-5 w-5" />
			</button>
		</li>
	{/if}
</ul>

<style lang="postcss">
	@reference "../../../../app.css";

	.symbol-grid {
		display: grid;
		gap: 4px;
		grid-template-columns: repeat(4, 80px);
		padding: 6px;
		max-height: 60vh;
		overflow-y: auto;
	}

	.symbol-grid[data-group='greek'] {
		grid-template-columns: repeat(6, 56px);
	}

	.symbol-grid[data-group='matrices'] {
		grid-template-columns: repeat(3, 66px);
	}

	.env-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
		width: 260px;
		max-height: 60vh;
		overflow-y: auto;
	}

	.env-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		width: 100%;
		padding: 8px 12px;
		border-radius: 4px;
		border: 1px solid transparent;
		background: var(--color-surface-100);
		text-align: left;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.env-btn:hover {
		background: var(--color-blue-200, #bfdbfe);
		border-color: var(--color-blue-400, #60a5fa);
	}

	.env-btn:active {
		@apply bg-blue-300;
	}

	.env-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-surface-600);
	}

	.env-preview {
		display: flex;
		align-items: center;
		font-size: 0.95rem;
		pointer-events: none;
	}

	.symbol-btn {
		display: grid;
		place-items: center;
		width: 80px;
		height: 80px;
		border-radius: 4px;
		border: 1px solid transparent;
		background: var(--color-surface-100);
		transition:
			background-color 0.15s,
			border-color 0.15s;
		overflow: hidden;
	}

	.symbol-content {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.symbol-grid[data-group='matrices'] .symbol-btn {
		width: 66px;
		height: 66px;
		padding: 4px;
	}

	.symbol-grid[data-group='matrices'] .symbol-content {
		font-size: 1.1rem;
	}

	.symbol-grid[data-group='greek'] .symbol-btn {
		width: 56px;
		height: 56px;
	}

	.symbol-grid[data-group='greek'] .symbol-content {
		font-size: 1.8rem;
	}

	.symbol-btn:hover {
		background: var(--color-blue-200, #bfdbfe);
		border-color: var(--color-blue-400, #60a5fa);
	}

	.symbol-btn:active {
		@apply bg-blue-300;
	}
</style>
