import { describe, it, expect } from 'vitest';
import { macroOptions, macroLookup } from '../../../../../../src/lib/editor/extensions/intellisense/completion/macros';

describe('macro completion: static CTAN DB + user-defined \\newcommand scan', () => {
	it('includes the static CTAN database', () => {
		const options = macroOptions('');
		expect(options.length).toBeGreaterThan(200);
		expect(options.some((o) => o.label === '\\section')).toBe(true);
	});

	it("picks up a user's own \\newcommand as a completion, tagged as defined in this file", () => {
		const text = '\\newcommand{\\myMacro}[1]{Hello #1}\n\\myMacro{world}';
		const options = macroOptions(text);
		const mine = options.find((o) => o.label === '\\myMacro');
		expect(mine).toBeTruthy();
		expect(mine?.detail).toContain('defined in this file');
	});

	it('does not duplicate a name the static DB already documents', () => {
		// \section is already in the static DB; redefining it should not add a second entry
		const text = '\\renewcommand{\\section}[1]{X}';
		const options = macroOptions(text);
		const sections = options.filter((o) => o.label === '\\section');
		expect(sections).toHaveLength(1);
	});

	it('macroLookup finds a static macro by name', () => {
		expect(macroLookup('', 'section')).not.toBeNull();
	});

	it('macroLookup returns null for an unrecognized macro', () => {
		expect(macroLookup('', 'totallyMadeUpMacroXyz')).toBeNull();
	});

	it('macroLookup finds a user-defined macro scanned from the given text', () => {
		const text = '\\newcommand{\\myMacro}{x}';
		expect(macroLookup(text, 'myMacro')).not.toBeNull();
	});

	it('does not throw on an unparseable mid-edit buffer', () => {
		expect(() => macroOptions('\\newcommand{\\incomplete')).not.toThrow();
	});
});
