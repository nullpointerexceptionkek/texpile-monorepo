// tab-set semantics: dedupe by path identity, neighbor pick on close, folder rename/delete
// fan-out, and pruning against the live tree
import { describe, expect, it, beforeEach } from 'vitest';
import { tabs } from '$lib/workspace/tabs.svelte';

describe('tabs store', () => {
	beforeEach(() => tabs.bind(null, false));

	it('dedupes opens case-insensitively and cycles in order', () => {
		tabs.noteOpened('C:\\p\\main.tex');
		tabs.noteOpened('C:\\p\\intro.tex');
		tabs.noteOpened('C:\\P\\MAIN.TEX'); // same file, Windows casing
		expect(tabs.list.length).toBe(2);
		expect(tabs.cycle('C:\\p\\main.tex', 1)).toBe('C:\\p\\intro.tex');
		expect(tabs.cycle('C:\\p\\main.tex', -1)).toBe('C:\\p\\intro.tex');
	});

	it('closing the active tab hands over to the right neighbor, then left', () => {
		for (const f of ['a.tex', 'b.tex', 'c.tex']) tabs.noteOpened(`C:\\p\\${f}`);
		expect(tabs.neighborOf('C:\\p\\b.tex')).toBe('C:\\p\\c.tex');
		tabs.close('C:\\p\\c.tex');
		expect(tabs.neighborOf('C:\\p\\b.tex')).toBe('C:\\p\\a.tex');
	});

	it('folder rename and delete fan out to contained tabs, prune drops dead files', () => {
		tabs.noteOpened('C:\\p\\ch\\one.tex');
		tabs.noteOpened('C:\\p\\main.tex');
		tabs.rename('C:\\p\\ch', 'C:\\p\\parts');
		expect(tabs.list[0]).toBe('C:\\p\\parts\\one.tex');
		tabs.closeUnder('C:\\p\\parts');
		expect(tabs.list).toEqual(['C:\\p\\main.tex']);
		tabs.prune([]);
		expect(tabs.list).toEqual([]);
	});
});
