import { writable } from 'svelte/store';
import type { LatexLogParseResult } from '$lib/latex-log';

/** parse result of the latest compile's .log; null before the first compile. set by WorkspaceView's log watcher. */
export interface CompileLogState extends LatexLogParseResult {
	logPath: string;
	/** epoch ms of the log state this was parsed from. */
	updatedAt: number;
}

export const compileLog = writable<CompileLogState | null>(null);

/** resolves a log-printed path (usually "./sub/x.tex", relative to the workspace root) to an
 *  absolute path. null for files outside the workspace (TeX installation files), shown but not clickable. */
export function resolveLogPath(root: string, file: string | undefined): string | null {
	if (!root || !file) return null;
	let f = file.replace(/\\/g, '/').trim();
	if (/^(?:[A-Za-z]:\/|\/)/.test(f)) {
		// absolute: only inside the workspace (case-insensitive compare, Windows)
		const rootNorm = root.replace(/\\/g, '/').replace(/\/+$/, '');
		return f.toLowerCase().startsWith(rootNorm.toLowerCase() + '/') ? f : null;
	}
	f = f.replace(/^\.\//, '');
	if (f.startsWith('../')) return null; // outside the folder
	const rootNorm = root.replace(/\\/g, '/').replace(/\/+$/, '');
	return `${rootNorm}/${f}`;
}
