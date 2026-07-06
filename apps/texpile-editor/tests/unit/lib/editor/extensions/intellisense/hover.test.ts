import { describe, it, expect } from 'vitest';
import { tokenAt, findLabelOffset } from '../../../../../../src/lib/editor/extensions/intellisense/hover';

describe('hover token detection (tokenAt)', () => {
	it('finds a macro token under the cursor', () => {
		const line = '\\textbf{hello}';
		const token = tokenAt(line, 0, 3); // inside "textbf"
		expect(token).toEqual({ kind: 'macro', value: 'textbf', from: 0, to: 7 });
	});

	it('finds a package name inside \\usepackage{...}', () => {
		const line = '\\usepackage{hyperref}';
		const token = tokenAt(line, 0, 15); // inside "hyperref"
		expect(token?.kind).toBe('package');
		expect(token?.value).toBe('hyperref');
	});

	it('finds a class name inside \\documentclass{...}', () => {
		const line = '\\documentclass{article}';
		const token = tokenAt(line, 0, 18);
		expect(token?.kind).toBe('class');
		expect(token?.value).toBe('article');
	});

	it('finds the specific key under the cursor in a comma-separated \\cite{a,b,c}', () => {
		const line = '\\cite{knuth1984,lamport1994}';
		const token = tokenAt(line, 0, line.indexOf('lamport') + 3);
		expect(token?.kind).toBe('citekey');
		expect(token?.value).toBe('lamport1994');
	});

	it('finds a \\ref label', () => {
		const line = '\\ref{fig:one}';
		const token = tokenAt(line, 0, 7);
		expect(token?.kind).toBe('label');
		expect(token?.value).toBe('fig:one');
	});

	it('offsets are relative to a non-zero lineStart', () => {
		const lineStart = 'preamble\n'.length;
		const token = tokenAt('\\textbf{x}', lineStart, lineStart + 3);
		expect(token?.from).toBe(lineStart);
	});

	it('returns null over plain prose', () => {
		expect(tokenAt('just some words', 0, 5)).toBeNull();
	});
});

describe('findLabelOffset', () => {
	it('finds the buffer offset of a \\label{...} definition', () => {
		const text = 'intro text\n\\section{X}\\label{sec:x}\nmore text';
		const offset = findLabelOffset(text, 'sec:x');
		expect(offset).toBe(text.indexOf('\\label{sec:x}'));
	});

	it('returns null when the label is not defined', () => {
		expect(findLabelOffset('no labels here', 'sec:x')).toBeNull();
	});
});
