import { readFileSync } from 'node:fs';

/**
 * Splits a fixture file into named cases delimited by `% === CASE: name ===` comment markers.
 * Each case's source is everything up to the next marker (or EOF), verbatim. Usage:
 *
 *   const cases = loadCases(join(__dirname, 'fixtures', 'my-cases.tex'));
 *   cases.get('some case name') // -> that case's source
 */
export function loadCases(path: string): Map<string, string> {
	const text = readFileSync(path, 'utf8');
	const marker = /^% === CASE: (.+?) ===$/gm;
	const matches = [...text.matchAll(marker)];
	const cases = new Map<string, string>();
	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].index! + matches[i][0].length;
		const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
		cases.set(matches[i][1], text.slice(start, end).replace(/^\n+/, ''));
	}
	return cases;
}
