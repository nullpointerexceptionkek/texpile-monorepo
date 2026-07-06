import { parseBibLog } from './blg-parser';
import { parseLatexLog } from './parser';
import { enrichLogEntries } from './rules';
import type { LatexLogParseResult, LogEntry, ParseLatexLogOptions } from './types';

export { parseBibLog } from './blg-parser';
export type { BibLogParseResult } from './blg-parser';
export { parseLatexLog } from './parser';
export { enrichLogEntries } from './rules';
export type { LatexLogParseResult, LogEntry, LogFileNode, LogLevel, LogRunStatus, ParseLatexLogOptions } from './types';

function withLevels(result: LatexLogParseResult, entries: LogEntry[]): LatexLogParseResult {
	return {
		...result,
		entries,
		errors: entries.filter((e) => e.level === 'error'),
		warnings: entries.filter((e) => e.level === 'warning'),
		badboxes: entries.filter((e) => e.level === 'badbox')
	};
}

/** parses and attaches rule ids/hints, dropping cascade restatements. */
export function parseAndEnrichLatexLog(text: string, options?: ParseLatexLogOptions): LatexLogParseResult {
	const result = parseLatexLog(text, options);
	return withLevels(result, enrichLogEntries(result.entries));
}

/** parses the engine log plus the optional bib log (.blg, bibtex or biber auto-detected); bib entries are appended after the engine's. */
export function parseCompileDiagnostics(logText: string, blgText?: string | null, options?: ParseLatexLogOptions): LatexLogParseResult {
	const result = parseLatexLog(logText, options);
	const bib = blgText ? parseBibLog(blgText).entries : [];
	return withLevels(result, enrichLogEntries([...result.entries, ...bib]));
}
