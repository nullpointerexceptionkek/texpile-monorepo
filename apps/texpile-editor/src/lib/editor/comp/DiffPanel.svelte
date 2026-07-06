<script lang="ts">
	// read-only HEAD vs working-buffer diff via @codemirror/merge. purely presentational:
	// WorkspaceView passes the snapshot pair down, so this re-diffs on snapshot/layout changes only, never per keystroke.
	import { onDestroy } from 'svelte';
	import { EditorView, lineNumbers } from '@codemirror/view';
	import { EditorState, type Extension } from '@codemirror/state';
	import { LanguageDescription } from '@codemirror/language';
	import { languages as cmlangdata } from '@codemirror/language-data';
	import { unifiedMergeView, MergeView } from '@codemirror/merge';
	import { cmSyntaxHighlight } from '$lib/editor/cmHighlight';
	import { bibtex } from '$lib/editor/extensions/bibtex/bibtex';

	let {
		filename = '',
		original = '',
		modified = '',
		layout = 'unified'
	}: { filename?: string; original?: string; modified?: string; layout?: 'unified' | 'split' } = $props();

	let host = $state<HTMLDivElement>();
	let current: EditorView | MergeView | null = null;
	let langExt = $state<Extension>([]);

	// normalize CRLF -> LF on both sides: git show returns LF bytes while the working buffer may be
	// CRLF (core.autocrlf on Windows); without this every line reads as changed
	const lf = (s: string) => s.replace(/\r\n/g, '\n');
	const COLLAPSE = { margin: 3, minSize: 4 };

	// resolve the syntax mode for filename into a plain extension so the build below can
	// drop it into both panes without compartment juggling
	$effect(() => {
		const f = filename;
		if (f && /\.bib$/i.test(f)) {
			langExt = bibtex();
			return;
		}
		const desc =
			!f || /\.(tex|cls|sty)$/i.test(f) ? cmlangdata.find((l) => l.name === 'LaTeX') : LanguageDescription.matchFilename(cmlangdata, f);
		if (!desc) {
			langExt = [];
			return;
		}
		let cancelled = false;
		desc.load().then((lang) => {
			if (!cancelled) langExt = lang;
		});
		return () => {
			cancelled = true;
		};
	});

	function baseExts(): Extension[] {
		return [
			EditorState.readOnly.of(true),
			EditorView.editable.of(false),
			lineNumbers(),
			cmSyntaxHighlight(),
			langExt,
			EditorView.lineWrapping
		];
	}

	// rebuild the view on snapshot/layout/language changes; rebuilding is the simplest
	// correct way to force a re-diff and it fires rarely
	$effect(() => {
		const o = lf(original);
		const m = lf(modified);
		const lay = layout;
		void langExt; // rebuild when the resolved language arrives
		if (!host) return;
		current?.destroy();
		host.replaceChildren();
		if (lay === 'split') {
			current = new MergeView({
				parent: host,
				a: { doc: o, extensions: baseExts() }, // original (HEAD)
				b: { doc: m, extensions: baseExts() }, // modified (working)
				orientation: 'a-b',
				gutter: true,
				highlightChanges: true,
				collapseUnchanged: COLLAPSE
			});
		} else {
			current = new EditorView({
				parent: host,
				state: EditorState.create({
					doc: m,
					extensions: [...baseExts(), unifiedMergeView({ original: o, mergeControls: false, gutter: true, collapseUnchanged: COLLAPSE })]
				})
			});
		}
	});

	onDestroy(() => current?.destroy());
</script>

<div bind:this={host} class="diff-panel h-full"></div>

<style>
	.diff-panel :global(.cm-editor) {
		height: 100%;
		font-size: 0.875rem;
	}
	.diff-panel :global(.cm-mergeView),
	.diff-panel :global(.cm-mergeViewEditors) {
		height: 100%;
	}
	.diff-panel :global(.cm-scroller) {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		line-height: 1.6;
	}
	.diff-panel :global(.cm-content) {
		padding: 0.5rem 0;
	}
	.diff-panel :global(.cm-focused) {
		outline: none;
	}

	/* collapsed unchanged region: theme-matched band instead of @codemirror/merge's washed-out defaults */
	.diff-panel :global(.cm-collapsedLines) {
		background: color-mix(in srgb, var(--color-surface-500) 12%, transparent);
		color: var(--color-surface-500);
	}

	/* deleted = error red, added = success green. cm-merge-a is the original pane, cm-merge-b the
	   modified one; the unified editor is cm-merge-b, so these cover both layouts. */
	.diff-panel :global(.cm-deletedChunk),
	.diff-panel :global(.cm-deletedLine),
	.diff-panel :global(.cm-merge-a .cm-changedLine) {
		background-color: color-mix(in srgb, var(--color-error-500) 12%, transparent) !important;
	}
	.diff-panel :global(.cm-deletedText),
	.diff-panel :global(.cm-deletedChunk .cm-deletedText),
	.diff-panel :global(.cm-merge-a .cm-changedText) {
		background: color-mix(in srgb, var(--color-error-500) 30%, transparent) !important;
	}
	.diff-panel :global(.cm-insertedLine),
	.diff-panel :global(.cm-merge-b .cm-changedLine) {
		background-color: color-mix(in srgb, var(--color-success-500) 12%, transparent) !important;
	}
	.diff-panel :global(.cm-merge-b .cm-changedText) {
		background: color-mix(in srgb, var(--color-success-500) 30%, transparent) !important;
	}
	.diff-panel :global(.cm-deletedLineGutter),
	.diff-panel :global(.cm-merge-a .cm-changedLineGutter) {
		background: var(--color-error-500) !important;
	}
	.diff-panel :global(.cm-merge-b .cm-changedLineGutter) {
		background: var(--color-success-500) !important;
	}
</style>
