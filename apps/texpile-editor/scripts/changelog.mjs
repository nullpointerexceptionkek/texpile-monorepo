// Parse the root CHANGELOG.md (the single source of truth). Shared by vite.config.ts (bundles
// the latest entry for the What's New modal) and the release/manifest scripts. Pure string work,
// no deps. Format is Keep-a-Changelog-ish:
//
//   ## [Unreleased]
//   - a pending note
//
//   ## [0.13.0] - 2026-07-13
//   - a shipped note
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_CHANGELOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../CHANGELOG.md');

/** @typedef {{ version: string, date?: string, notes: string[], released: boolean }} Entry */

/** parse changelog text into entries, in file order (newest first by convention). */
export function parse(text) {
	/** @type {Entry[]} */
	const entries = [];
	let cur = null;
	for (const raw of text.split('\n')) {
		const h = raw.match(/^##\s+\[?([^\]\s]+)\]?(?:\s*[-–]\s*(\d{4}-\d{2}-\d{2}))?/);
		if (h) {
			cur = { version: h[1], date: h[2], notes: [], released: /^\d+\.\d+\.\d+/.test(h[1]) };
			entries.push(cur);
			continue;
		}
		const b = raw.match(/^\s*[-*]\s+(.*\S)\s*$/);
		if (b && cur) cur.notes.push(b[1]);
	}
	return entries;
}

export function readChangelog() {
	return parse(fs.readFileSync(ROOT_CHANGELOG, 'utf8'));
}

/** the newest shipped (numbered) entry, or null before the first release is cut. */
export function latestReleased() {
	return readChangelog().find((e) => e.released) ?? null;
}

/** the Unreleased entry (pending notes awaiting a release), or null. */
export function unreleased() {
	return readChangelog().find((e) => e.version.toLowerCase() === 'unreleased') ?? null;
}

export { ROOT_CHANGELOG };
