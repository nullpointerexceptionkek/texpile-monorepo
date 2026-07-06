import { describe, it, expect } from 'vitest';
import {
	simpleFrontmatter,
	extractPreambleFrontmatter,
	replacePreambleFrontmatter,
	placeholderCommand
} from '../../../../../../src/lib/editor/extensions/raw-latex/frontmatterView';

describe('simpleFrontmatter — body raw_latex detection (AST, not regex)', () => {
	it('detects a plain single-argument \\title/\\author/\\date', () => {
		expect(simpleFrontmatter('\\title{Hello World}')).toEqual({ kind: 'title', inner: 'Hello World' });
		expect(simpleFrontmatter('\\author{Jane Doe}')).toEqual({ kind: 'author', inner: 'Jane Doe' });
		expect(simpleFrontmatter('\\title{}')).toEqual({ kind: 'title', inner: '' });
	});

	it('rejects anything not a single plain-text frontmatter macro', () => {
		expect(simpleFrontmatter('\\title{A \\textbf{b}}')).toBeNull(); // nested macro → not plain
		expect(simpleFrontmatter('\\date{\\today}')).toBeNull(); // a macro, not plain text
		expect(simpleFrontmatter('\\title[short]{Hi}')).toBeNull(); // has an optional arg
		expect(simpleFrontmatter('\\titlepage')).toBeNull(); // different macro
		expect(simpleFrontmatter('\\maketitle')).toBeNull();
		expect(simpleFrontmatter('\\title{Hi}\n\\author{Me}')).toBeNull(); // more than one
		expect(simpleFrontmatter('text \\title{Hi}')).toBeNull(); // surrounding prose
	});
});

describe('placeholderCommand (hidden structural commands)', () => {
	it('recognises \\maketitle and friends (with surrounding whitespace)', () => {
		expect(placeholderCommand('\\maketitle')).toEqual({ command: 'maketitle', label: 'Title' });
		expect(placeholderCommand('  \\maketitle\n')).toEqual({ command: 'maketitle', label: 'Title' });
		expect(placeholderCommand('\\tableofcontents')?.command).toBe('tableofcontents');
	});

	it('recognises \\printbibliography, plain and with [options]', () => {
		expect(placeholderCommand('\\printbibliography')).toEqual({ command: 'printbibliography', label: 'Bibliography' });
		expect(placeholderCommand('\\printbibliography[title={Works Cited}]')).toEqual({ command: 'printbibliography', label: 'Bibliography' });
		expect(placeholderCommand('  \\printbibliography[heading=bibintoc]\n')?.command).toBe('printbibliography');
	});

	it('does not match similar names, args, or frontmatter', () => {
		expect(placeholderCommand('\\maketitlepage')).toBeNull();
		expect(placeholderCommand('\\section{X}')).toBeNull();
		expect(placeholderCommand('\\title{X}')).toBeNull();
		expect(placeholderCommand('\\maketitle and text')).toBeNull();
	});
});

describe('extractPreambleFrontmatter', () => {
	it('finds the first of each kind in document order, ignoring comments', () => {
		const preamble = '\\documentclass{article}\n\\title{My Paper}\n\\author{Jane}\n% \\title{commented}\n\\date{2024}';
		expect(extractPreambleFrontmatter(preamble)).toEqual([
			{ kind: 'title', inner: 'My Paper' },
			{ kind: 'author', inner: 'Jane' },
			{ kind: 'date', inner: '2024' }
		]);
	});

	it('skips macros with non-plain or optional args (left to the preamble panel)', () => {
		expect(extractPreambleFrontmatter('\\title{A \\thanks{x}}\n\\author[a]{B}')).toEqual([]);
	});
});

describe('replacePreambleFrontmatter — verbatim splice via AST offsets', () => {
	it('rewrites only the brace interior, preserving the rest byte-for-byte', () => {
		const p = '\\documentclass{article}\n\\title{Old}\n\\author{Jane}\n';
		expect(replacePreambleFrontmatter(p, 'title', 'New Title')).toBe('\\documentclass{article}\n\\title{New Title}\n\\author{Jane}\n');
	});

	it('handles empty → filled and filled → empty', () => {
		expect(replacePreambleFrontmatter('\\title{}', 'title', 'X')).toBe('\\title{X}');
		expect(replacePreambleFrontmatter('\\title{X}', 'title', '')).toBe('\\title{}');
	});

	it('is a no-op when the kind is absent or only appears commented out', () => {
		expect(replacePreambleFrontmatter('\\author{Jane}', 'title', 'X')).toBe('\\author{Jane}');
		expect(replacePreambleFrontmatter('% \\title{c}', 'title', 'X')).toBe('% \\title{c}');
	});

	it('edits the real occurrence, never a commented one', () => {
		expect(replacePreambleFrontmatter('% \\title{comment}\n\\title{real}', 'title', 'NEW')).toBe('% \\title{comment}\n\\title{NEW}');
	});
});
