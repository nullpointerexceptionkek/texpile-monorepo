import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { glossaryCompletionSource } from '../../../../../../src/lib/editor/extensions/intellisense/completion/glossary';

function completeAt(doc: string, pos = doc.length) {
	const state = EditorState.create({ doc });
	return glossaryCompletionSource(new CompletionContext(state, pos, false));
}
const labels = (r: ReturnType<typeof completeAt>) => (r?.options ?? []).map((o) => o.label);

describe('glossary/acronym completion', () => {
	it('completes \\gls{...} from \\newglossaryentry', () => {
		const doc = '\\newglossaryentry{gpu}{description={Graphics Processing Unit}}\n\\gls{gp';
		expect(labels(completeAt(doc))).toContain('gpu');
	});

	it('completes \\acs{...} from \\newacronym', () => {
		const doc = '\\newacronym{cpu}{CPU}{Central Processing Unit}\n\\acs{cp';
		expect(labels(completeAt(doc))).toContain('cpu');
	});

	it('acronym-prefixed macros only offer acronym entries, not plain glossary entries', () => {
		const doc =
			'\\newglossaryentry{gpu}{description={Graphics Processing Unit}}\n' + '\\newacronym{cpu}{CPU}{Central Processing Unit}\n\\acs{';
		const labelsFound = labels(completeAt(doc));
		expect(labelsFound).toContain('cpu');
		expect(labelsFound).not.toContain('gpu');
	});

	it('\\gls{...} (not acronym-specific) offers both pools', () => {
		const doc =
			'\\newglossaryentry{gpu}{description={Graphics Processing Unit}}\n' + '\\newacronym{cpu}{CPU}{Central Processing Unit}\n\\gls{';
		const labelsFound = labels(completeAt(doc));
		expect(labelsFound).toContain('cpu');
		expect(labelsFound).toContain('gpu');
	});

	it('returns nothing when there are no glossary/acronym definitions', () => {
		expect(completeAt('\\gls{foo')).toBeNull();
	});
});
