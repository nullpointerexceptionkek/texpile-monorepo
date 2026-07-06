// client-side git access over Electron IPC. never throws: a non-repo folder, a missing
// git binary, or a missing bridge comes back as { ok: false }
import { native } from './fileSystem';

/** single-letter tree badge (VS Code convention). */
export type GitBadge = 'M' | 'A' | 'D' | 'U' | 'R';

export interface GitStatusEntry {
	path: string; // absolute, matching the file-tree's path strings
	x: string; // index (staged) porcelain char, ' ' if none, '?' if untracked
	y: string; // working-dir (unstaged) porcelain char
}

export interface GitStatusResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
	branch?: string;
	entries?: GitStatusEntry[];
}

export interface GitShowResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
	hasHead: boolean;
	content?: string;
}

export interface GitOpResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
}

const NO_BRIDGE = 'Git requires the Texpile desktop app.';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function gitStatus(root: string): Promise<GitStatusResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitStatus(root);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}

/** committed (HEAD) contents of a file, for diffing against the working copy. */
export async function gitShowHead(path: string): Promise<GitShowResult> {
	const n = native();
	if (!n) return { ok: false, hasHead: false, error: NO_BRIDGE };
	try {
		return await n.gitShow(path);
	} catch (e) {
		return { ok: false, hasHead: false, error: errMsg(e) };
	}
}

export async function gitInit(dir: string): Promise<GitOpResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitInit(dir);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}

/** stages files (empty = all). */
export async function gitStage(root: string, paths: string[] = []): Promise<GitOpResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitStage(root, paths);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}

/** unstages files (empty = all). */
export async function gitUnstage(root: string, paths: string[] = []): Promise<GitOpResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitUnstage(root, paths);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}

/** discards unstaged working-tree changes to tracked files. */
export async function gitDiscard(root: string, paths: string[]): Promise<GitOpResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitDiscard(root, paths);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}

export async function gitCommit(root: string, message: string): Promise<GitOpResult> {
	const n = native();
	if (!n) return { ok: false, error: NO_BRIDGE };
	try {
		return await n.gitCommit(root, message);
	} catch (e) {
		return { ok: false, error: errMsg(e) };
	}
}
