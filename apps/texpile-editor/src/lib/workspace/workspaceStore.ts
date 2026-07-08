// reactive state for the open workspace; the file path is the identity, no doc ids
import { writable } from 'svelte/store';
import { browser } from '$lib/runtime';
import type { TexFile, TreeEntry } from './fileSystem';

const RECENT_KEY = 'texpile:recentFolders';
const MAIN_KEY = 'texpile:mainFiles'; // { [folderRoot]: relPathOfMainFile }
const CMD_KEY = 'texpile:compileCommands'; // { [folderRoot]: compile command }

export const workspaceRoot = writable<string | null>(null);

export const texFiles = writable<TexFile[]>([]);

export const fileTree = writable<TreeEntry[]>([]);

export const activeFilePath = writable<string | null>(null);

/** the main entry .tex, anchors cross-file macro resolution. auto-detected, user-overridable, persisted per folder. */
export const mainFile = writable<string | null>(null);

export const isDirty = writable<boolean>(false);

/** most-recent first, persisted to localStorage. */
export const recentFolders = writable<string[]>(loadRecent());

function loadRecent(): string[] {
	if (!browser) return [];
	try {
		const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

export function addRecentFolder(path: string): void {
	recentFolders.update((list) => {
		const next = [path, ...list.filter((p) => p !== path)].slice(0, 8);
		if (browser) localStorage.setItem(RECENT_KEY, JSON.stringify(next));
		return next;
	});
}

const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
/** path of abs relative to root (forward slashes), or abs unchanged if not under root. */
function relInRoot(root: string, abs: string): string {
	const r = norm(root) + '/';
	const a = norm(abs);
	return a.startsWith(r) ? a.slice(r.length) : a;
}
/** joins a folder + a stored relative path back into an absolute path (native-ish separators). */
function absInRoot(root: string, rel: string): string {
	const sep = root.includes('\\') ? '\\' : '/';
	return norm(root) + sep + rel.split('/').join(sep);
}

function loadMainMap(): Record<string, string> {
	if (!browser) return {};
	try {
		const v = JSON.parse(localStorage.getItem(MAIN_KEY) || '{}');
		return v && typeof v === 'object' ? v : {};
	} catch {
		return {};
	}
}

/** the persisted main-file path for a folder (absolute), or null if none was saved. */
export function savedMainFile(root: string): string | null {
	const rel = loadMainMap()[norm(root)];
	return rel ? absInRoot(root, rel) : null;
}

/** remembers (or clears) the chosen main file for a folder, and updates the live store. */
export function setMainFile(root: string, path: string | null): void {
	mainFile.set(path);
	if (!browser) return;
	const map = loadMainMap();
	if (path) map[norm(root)] = relInRoot(root, path);
	else delete map[norm(root)];
	localStorage.setItem(MAIN_KEY, JSON.stringify(map));
}

function loadCmdMap(): Record<string, string> {
	if (!browser) return {};
	try {
		const v = JSON.parse(localStorage.getItem(CMD_KEY) || '{}');
		return v && typeof v === 'object' ? v : {};
	} catch {
		return {};
	}
}

/** the folder's own compile command, or null to fall back to the global default. */
export function savedCompileCommand(root: string): string | null {
	return loadCmdMap()[norm(root)] ?? null;
}

/** remembers (or clears) a folder-specific compile command. */
export function setFolderCompileCommand(root: string, cmd: string | null): void {
	if (!browser) return;
	const map = loadCmdMap();
	if (cmd) map[norm(root)] = cmd;
	else delete map[norm(root)];
	localStorage.setItem(CMD_KEY, JSON.stringify(map));
}
