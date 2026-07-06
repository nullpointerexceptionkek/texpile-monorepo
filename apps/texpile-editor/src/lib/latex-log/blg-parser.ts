// .blg parser, two unrelated formats auto-detected: bibtex free-form text
// ("Warning--...", "---line N of file F") and biber's one record per line.

import type { LogEntry } from './types';

export interface BibLogParseResult {
	tool: 'bibtex' | 'biber' | null;
	entries: LogEntry[];
}

const BIBER_LINE = /^\[\d+\] [^>]*> (INFO|WARN|ERROR) - (.*)$/;

const B_LINE_OF_FILE = /^(.*?)---line (\d+) of file (.+)$/;
const B_WHILE_READING = /^(.*?)---while reading file (.+)$/;
const B_CONT_LINE_OF_FILE = /^--line (\d+) of file (.+)$/;

export function parseBibLog(text: string): BibLogParseResult {
	const lines = text.replace(/\r\n?/g, '\n').split('\n');
	if (lines.some((l) => BIBER_LINE.test(l))) return parseBiber(lines);
	if (lines.some((l) => /^This is BibTeX/.test(l) || /^Warning--/.test(l))) return parseBibtex(lines);
	return { tool: null, entries: [] };
}

function parseBibtex(lines: string[]): BibLogParseResult {
	const entries: LogEntry[] = [];
	const databases: string[] = [];
	let i = 0;

	const isContext = (l: string) =>
		l.startsWith(' : ') || l === '(Error may have been on previous line)' || /^I'm skipping whatever remains/.test(l);

	while (i < lines.length) {
		const line = lines[i];

		// stats tail: nothing diagnostic follows
		if (/^You've used\s/.test(line)) break;

		const warn = line.match(/^Warning--(.*)$/);
		if (warn) {
			const entry: LogEntry = { level: 'warning', message: warn[1], source: 'bib', raw: line };
			const cont = lines[i + 1]?.match(B_CONT_LINE_OF_FILE);
			if (cont) {
				entry.line = parseInt(cont[1], 10);
				entry.file = cont[2];
				entry.raw += '\n' + lines[i + 1];
				i++;
			} else if (databases.length === 1 && /\bin \S+$/.test(warn[1])) {
				// keyed warning ("empty journal in <key>"): only attributable when one database is in play
				entry.file = databases[0];
			}
			entries.push(entry);
			i++;
			continue;
		}

		const db = line.match(/^Database file #\d+: (.+)$/);
		if (db) {
			databases.push(db[1].trim());
			i++;
			continue;
		}

		const located = line.match(B_LINE_OF_FILE);
		const reading = located ? null : line.match(B_WHILE_READING);
		const crossref = line.match(/^A bad cross reference---entry (.+)$/);
		// errors without an inline location ("I couldn't open style file x.bst")
		const bare = /^(I couldn't open |Sorry---|Aborted |Illegal, )/.test(line);

		if (located || reading || crossref || bare) {
			const entry: LogEntry = {
				level: 'error',
				message: (located?.[1] || reading?.[1] || line).trim() || line,
				source: 'bib',
				raw: line
			};
			if (located) {
				entry.line = parseInt(located[2], 10);
				entry.file = located[3];
			} else if (reading) {
				entry.file = reading[2];
			}
			// consume continuations: crossref "refers to entry", stand-alone location, " : " context, skip-markers
			const ctx: string[] = [];
			while (i + 1 < lines.length) {
				const next = lines[i + 1];
				const loc = next.match(/^---line (\d+) of file (.+)$/);
				if (loc) {
					entry.line = entry.line ?? parseInt(loc[1], 10);
					entry.file = entry.file ?? loc[2];
					entry.raw += '\n' + next;
					i++;
					continue;
				}
				if (crossref && /^refers to entry /.test(next)) {
					entry.message += ' ' + next;
					entry.raw += '\n' + next;
					i++;
					continue;
				}
				if (isContext(next)) {
					ctx.push(next);
					entry.raw += '\n' + next;
					i++;
					continue;
				}
				break;
			}
			if (ctx.length > 0) entry.context = ctx.join('\n');
			entries.push(entry);
			i++;
			continue;
		}

		i++;
	}
	return { tool: 'bibtex', entries };
}

function parseBiber(lines: string[]): BibLogParseResult {
	const entries: LogEntry[] = [];
	let lastSource: string | undefined;

	for (const line of lines) {
		const m = line.match(BIBER_LINE);
		if (!m) continue;
		const [, level, msg] = m;
		if (level === 'INFO') {
			const src = msg.match(/^Found BibTeX data source '(.+)'/);
			if (src) lastSource = src[1];
			continue;
		}
		const entry: LogEntry = {
			level: level === 'ERROR' ? 'error' : 'warning',
			message: msg,
			source: 'bib',
			raw: line
		};
		// biber names a temp .utf8 copy of the .bib; the line number maps to the
		// original data source, so restore its name in both fields
		const temp = msg.match(/(?:[A-Za-z]:)?[^\s,'"]*biber_tmp[^\s,]*\.utf8/);
		if (temp && lastSource) {
			entry.message = msg.replace(temp[0], lastSource);
			entry.file = lastSource;
		} else if (/BibTeX subsystem|Datasource/.test(msg) && lastSource) {
			entry.file = lastSource;
		}
		const lineNo = entry.message.match(/\bline (\d+)\b/);
		if (lineNo) entry.line = parseInt(lineNo[1], 10);
		entries.push(entry);
	}
	return { tool: 'biber', entries };
}
