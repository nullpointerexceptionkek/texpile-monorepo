<script lang="ts">
	// Source-mode toolbar: buttons for the same LaTeX-wrapping shortcuts formatShortcuts() binds
	// (Mod-b/i/u/`/./,/Shift-b/Shift-`/Alt-1-2-3/m/Shift-m), for people who don't know the chords.
	// unlike the Visual toolbar, buttons don't show an "active" state, which would need re-parsing
	// the buffer around the cursor on every selection change, not worth it for a first pass.
	import { Bold, Italic, Underline, Code, Superscript, Subscript, Quote, Sigma } from '@lucide/svelte';
	import type { EditorState, TransactionSpec } from '@codemirror/state';
	import { sourceCmView } from '$lib/stores/editorStore';
	import { computeToggleWrap, computeWrapBlock } from '$lib/editor/extensions/intellisense/shortcuts';
	import SourceTableDropdown from './SourceTableDropdown.svelte';
	import SourceMathDropdown from './SourceMathDropdown.svelte';
	import { m } from '$lib/paraglide/messages';

	function run(build: (state: EditorState) => TransactionSpec) {
		return (e: MouseEvent) => {
			e.preventDefault(); // keep focus (and the caret) in the CodeMirror view
			const view = $sourceCmView;
			if (!view) return;
			view.dispatch(build(view.state));
			view.focus();
		};
	}

	const HEADINGS = [
		{ label: 'H1', macro: 'section' },
		{ label: 'H2', macro: 'subsection' },
		{ label: 'H3', macro: 'subsubsection' }
	];
</script>

<div class="flex items-center gap-1 sm:gap-1.5" data-keep-caret role="presentation" onmousedown={(e) => e.preventDefault()}>
	<ul class="border-surface-300-700 flex items-center gap-1 border-r pr-1.5 sm:gap-1.5 sm:pr-2">
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textbf'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_bold_aria()}
				title={m.srctoolbar_bold_title()}
			>
				<Bold class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textit'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_italic_aria()}
				title={m.srctoolbar_italic_title()}
			>
				<Italic class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'underline'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_underline_aria()}
				title={m.srctoolbar_underline_title()}
			>
				<Underline class="h-4.5 w-4.5 translate-y-[1px]" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'texttt'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_monospace_aria()}
				title={m.srctoolbar_monospace_title()}
			>
				<Code class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textsuperscript'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_superscript_aria()}
				title={m.srctoolbar_superscript_title()}
			>
				<Superscript class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textsubscript'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_subscript_aria()}
				title={m.srctoolbar_subscript_title()}
			>
				<Subscript class="h-4.5 w-4.5" />
			</button>
		</li>
	</ul>

	<ul class="border-surface-300-700 flex items-center gap-1 border-r pr-1.5 sm:gap-1.5 sm:pr-2">
		{#each HEADINGS as h (h.macro)}
			<li class="toolbarButton hover:preset-tonal">
				<button
					onclick={run((s) => computeWrapBlock(s, `\\${h.macro}{`, '}'))}
					class="flex h-6 min-w-6 items-center justify-center px-1 text-xs font-semibold"
					aria-label={h.label}
					title={h.label}
				>
					{h.label}
				</button>
			</li>
		{/each}
	</ul>

	<ul class="border-surface-300-700 flex items-center gap-1 border-r pr-1.5 sm:gap-1.5 sm:pr-2">
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\begin{quote}\n', '\n\\end{quote}'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_quote_block_aria()}
				title={m.srctoolbar_quote_title()}
			>
				<Quote class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\begin{verbatim}\n', '\n\\end{verbatim}'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_verbatim_block_aria()}
				title={m.srctoolbar_verbatim_title()}
			>
				<Code class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\(', '\\)'))}
				class="flex items-center p-1"
				aria-label={m.srctoolbar_inline_math_aria()}
				title={m.srctoolbar_inline_math_title()}
			>
				<Sigma class="h-4.5 w-4.5" />
			</button>
		</li>
	</ul>

	<ul class="flex items-center gap-1 sm:gap-1.5">
		<li><SourceTableDropdown /></li>
		<li><SourceMathDropdown /></li>
	</ul>
</div>

<style lang="postcss">
	@reference "../../../../app.css";

	.toolbarButton {
		@apply rounded-base transition-all ease-in-out;
	}
</style>
