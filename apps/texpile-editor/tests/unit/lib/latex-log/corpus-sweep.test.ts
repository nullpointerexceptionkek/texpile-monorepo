/**
 * Corpus sweep for the LaTeX log parser, env-gated (inert in CI).
 *
 *   LOG_CORPUS_DIR=<dir>   recursively parse every *.log under <dir>
 *                          (e.g. the render-fidelity corpus compile logs),
 *                          assert no crashes + structural sanity, print stats.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAndEnrichLatexLog, parseBibLog } from '../../../../src/lib/latex-log';

function collect(dir: string, ext: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const st = statSync(p);
		if (st.isDirectory()) collect(p, ext, out);
		else if (name.endsWith(ext) && !name.startsWith('.')) out.push(p);
	}
	return out;
}

const corpusDir = process.env.LOG_CORPUS_DIR;

describe.skipIf(!corpusDir)('log corpus sweep', () => {
	it('parses every corpus .blg without crashing (bibtex or biber detected)', () => {
		const blgs = collect(corpusDir!, '.blg');
		let bibtex = 0;
		let biber = 0;
		let entries = 0;
		const problems: string[] = [];
		for (const path of blgs) {
			try {
				const r = parseBibLog(readFileSync(path, 'utf8'));
				if (r.tool === 'bibtex') bibtex++;
				else if (r.tool === 'biber') biber++;
				entries += r.entries.length;
				for (const e of r.entries) {
					if (e.line !== undefined && (!Number.isInteger(e.line) || e.line <= 0)) problems.push(`BAD LINE ${path}: ${e.line}`);
					if (/wiz_defined|built_in|^= --/.test(e.message)) problems.push(`STATS LEAK ${path}: "${e.message}"`);
				}
			} catch (err) {
				problems.push(`CRASH ${path}: ${err}`);
			}
		}
		console.log(`[blg sweep] ${blgs.length} blgs (${bibtex} bibtex, ${biber} biber) | ${entries} entries`);
		expect(problems).toEqual([]);
	});

	it('parses every corpus log without crashing, with sane structure', () => {
		const logs = collect(corpusDir!, '.log');
		expect(logs.length).toBeGreaterThan(0);
		let totalErrors = 0;
		let totalWarnings = 0;
		let totalBadboxes = 0;
		let withPages = 0;
		let entriesWithFile = 0;
		let entriesTotal = 0;
		const problems: string[] = [];
		for (const path of logs) {
			const text = readFileSync(path, 'utf8');
			let r;
			try {
				r = parseAndEnrichLatexLog(text);
			} catch (err) {
				problems.push(`CRASH ${path}: ${err}`);
				continue;
			}
			totalErrors += r.errors.length;
			totalWarnings += r.warnings.length;
			totalBadboxes += r.badboxes.length;
			if (r.status.pages !== undefined) withPages++;
			for (const e of [...r.errors, ...r.warnings]) {
				entriesTotal++;
				if (e.file) entriesWithFile++;
			}
			// structural sanity: every line number is a positive integer
			for (const e of r.entries) {
				if (e.line !== undefined && (!Number.isInteger(e.line) || e.line <= 0)) {
					problems.push(`BAD LINE ${path}: ${e.line} in "${e.message}"`);
				}
			}
		}
		console.log(
			`[sweep] ${logs.length} logs | errors ${totalErrors}, warnings ${totalWarnings}, ` +
				`badboxes ${totalBadboxes} | pages detected in ${withPages} | ` +
				`file attribution ${entriesWithFile}/${entriesTotal} ` +
				`(${((100 * entriesWithFile) / Math.max(1, entriesTotal)).toFixed(1)}%)`
		);
		expect(problems).toEqual([]);
	});
});
