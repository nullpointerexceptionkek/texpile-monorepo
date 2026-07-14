<script lang="ts">
	// Source-mode toolbar: buttons for the same LaTeX-wrapping shortcuts formatShortcuts() binds
	// (Mod-b/i/u/`/./,/Shift-b/Shift-`/Alt-1-2-3/m/Shift-m), for people who don't know the chords.
	// unlike the Visual toolbar, buttons don't show an "active" state, which would need re-parsing
	// the buffer around the cursor on every selection change, not worth it for a first pass.
	import { Bold, Italic, Underline, Code, Superscript, Subscript, Quote, Sigma } from '@lucide/svelte';
	import type { EditorState, TransactionSpec } from '@codemirror/state';
	import { sourceCmView } from '$lib/stores/editorStore';
	import { computeToggleWrap, computeWrapBlock } from '$lib/editor/extensions/intellisense/shortcuts';

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
			<button onclick={run((s) => computeToggleWrap(s, 'textbf'))} class="flex items-center p-1" aria-label="Bold" title="Bold (Ctrl+B)">
				<Bold class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textit'))}
				class="flex items-center p-1"
				aria-label="Italic"
				title="Italic (Ctrl+I)"
			>
				<Italic class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'underline'))}
				class="flex items-center p-1"
				aria-label="Underline"
				title="Underline (Ctrl+U)"
			>
				<Underline class="h-4.5 w-4.5 translate-y-[1px]" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'texttt'))}
				class="flex items-center p-1"
				aria-label="Code"
				title="Monospace (Ctrl+`)"
			>
				<Code class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textsuperscript'))}
				class="flex items-center p-1"
				aria-label="Superscript"
				title="Superscript (Ctrl+.)"
			>
				<Superscript class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeToggleWrap(s, 'textsubscript'))}
				class="flex items-center p-1"
				aria-label="Subscript"
				title="Subscript (Ctrl+,)"
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

	<ul class="flex items-center gap-1 sm:gap-1.5">
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\begin{quote}\n', '\n\\end{quote}'))}
				class="flex items-center p-1"
				aria-label="Quote block"
				title="Quote (Ctrl+Shift+B)"
			>
				<Quote class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\begin{verbatim}\n', '\n\\end{verbatim}'))}
				class="flex items-center p-1"
				aria-label="Code block"
				title="Verbatim block (Ctrl+Shift+`)"
			>
				<Code class="h-4.5 w-4.5" />
			</button>
		</li>
		<li class="toolbarButton hover:preset-tonal">
			<button
				onclick={run((s) => computeWrapBlock(s, '\\(', '\\)'))}
				class="flex items-center p-1"
				aria-label="Inline math"
				title="Inline math (Ctrl+M)"
			>
				<Sigma class="h-4.5 w-4.5" />
			</button>
		</li>
	</ul>
</div>

<style lang="postcss">
	@reference "../../../../app.css";

	.toolbarButton {
		@apply rounded-base transition-all ease-in-out;
	}
</style>
