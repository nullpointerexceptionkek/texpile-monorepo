import { describe, it, expect } from 'vitest';
import { unseenEntries } from '$lib/whatsNew';

// changelog order: newest first
const ALL = [
	{ version: '0.13.1', notes: ['fix a'] },
	{ version: '0.13.0', notes: ['live mode'] },
	{ version: '0.12.0', notes: ['older'] }
];

describe('what’s new selection', () => {
	it('shows every release skipped, oldest first', () => {
		expect(unseenEntries(ALL, '0.12.0').map((e) => e.version)).toEqual(['0.13.0', '0.13.1']);
	});

	it('shows only the new one when the previous release was seen', () => {
		expect(unseenEntries(ALL, '0.13.0').map((e) => e.version)).toEqual(['0.13.1']);
	});

	it('shows nothing when the newest was already seen', () => {
		expect(unseenEntries(ALL, '0.13.1')).toEqual([]);
	});

	it('empty marker (fresh install or pre-marker upgrade) shows everything, oldest first', () => {
		expect(unseenEntries(ALL, '').map((e) => e.version)).toEqual(['0.12.0', '0.13.0', '0.13.1']);
	});

	it('caps the empty-marker view at the newest entries', () => {
		const many = Array.from({ length: 12 }, (_, i) => ({ version: `0.${20 - i}.0`, notes: ['x'] }));
		const shown = unseenEntries(many, '').map((e) => e.version);
		expect(shown).toHaveLength(8);
		expect(shown[shown.length - 1]).toBe('0.20.0');
		expect(shown[0]).toBe('0.13.0');
	});

	it('handles an empty changelog', () => {
		expect(unseenEntries([], '')).toEqual([]);
	});
});
