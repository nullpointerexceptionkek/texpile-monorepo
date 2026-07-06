import { describe, it, expect } from 'vitest';
import { findMacroDefinition, includeTargetAt } from '../../../../../../src/lib/editor/extensions/intellisense/definition';

describe('go-to-definition helpers', () => {
	it('finds a \\newcommand definition by name', () => {
		const text = 'intro\n\\newcommand{\\foo}{bar text}\nmore \\foo here';
		expect(findMacroDefinition(text, 'foo')).toBe(text.indexOf('\\newcommand'));
	});

	it('finds a \\NewDocumentCommand definition too', () => {
		const text = '\\NewDocumentCommand{\\bar}{m}{#1}';
		expect(findMacroDefinition(text, 'bar')).toBe(0);
	});

	it('returns null for a macro with no definition in the buffer', () => {
		expect(findMacroDefinition('\\textbf{x}', 'textbf')).toBeNull();
	});

	it('finds an \\input{...} target under the cursor', () => {
		const line = '\\input{chapters/intro}';
		const target = includeTargetAt(line, 0, line.indexOf('intro') + 2);
		expect(target).toBe('chapters/intro');
	});

	it('returns null when the cursor is outside any include macro', () => {
		expect(includeTargetAt('plain text here', 0, 5)).toBeNull();
	});
});
