import { describe, it, expect } from 'vitest';
import { freeName } from '../../../../src/lib/workspace/fileSystem';

describe('freeName', () => {
	it('steps around taken names, suffixing before the extension and filling the first gap', () => {
		expect(freeName('untitled.tex', ['main.tex'])).toBe('untitled.tex');
		expect(freeName('untitled.tex', ['untitled.tex'])).toBe('untitled1.tex');
		expect(freeName('untitled.tex', ['untitled.tex', 'untitled2.tex'])).toBe('untitled1.tex');
	});

	it('matches case-insensitively, since Windows and macOS paths do', () => {
		expect(freeName('untitled.tex', ['UNTITLED.TEX'])).toBe('untitled1.tex');
	});

	it('treats a dotfile as a stem, not an extension', () => {
		expect(freeName('.gitignore', ['.gitignore'])).toBe('.gitignore1');
	});
});
