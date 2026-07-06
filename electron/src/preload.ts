import { contextBridge, ipcRenderer } from 'electron';

/** unwraps the { ok, value | error } results from main.ts handleFs back into throw semantics. */
async function invokeFs(channel: string, ...args: unknown[]): Promise<unknown> {
	const r = (await ipcRenderer.invoke(channel, ...args)) as { ok: boolean; value?: unknown; error?: string };
	if (r && r.ok) return r.value;
	throw new Error(r?.error ?? 'Unknown error');
}

contextBridge.exposeInMainWorld('texpileNative', {
	/** native folder picker; resolves to the chosen absolute path or null. */
	openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
	getSettings: () => ipcRenderer.invoke('settings:get'),
	/** merges a partial update into settings; resolves to the updated settings. */
	setSettings: (partial: Record<string, unknown>) => ipcRenderer.invoke('settings:set', partial),
	/** subscribe to "open this .tex" requests from the OS; returns an unsubscribe fn. */
	onOpenPath: (cb: (filePath: string) => void) => {
		const h = (_e: unknown, filePath: string) => cb(filePath);
		ipcRenderer.on('main:open-path', h);
		return () => ipcRenderer.removeListener('main:open-path', h);
	},

	/** recursively scan a folder for files of the given extensions (CSV, default 'tex'). */
	fsScan: (root: string, exts?: string) => invokeFs('fs:scan', root, exts),
	/** read a text file -> { content }. */
	fsRead: (path: string) => invokeFs('fs:read', path),
	fsWrite: (path: string, content: string) => invokeFs('fs:write', path, content),
	/** write raw bytes, creating parent dirs -> { ok }. */
	fsWriteBinary: (path: string, data: ArrayBuffer) => invokeFs('fs:writeBinary', path, data),
	/** nested file/folder tree -> { root, children }. */
	fsTree: (root: string) => invokeFs('fs:tree', root),
	/** create / delete / rename -> { ok }. */
	fsOp: (body: Record<string, unknown>) => invokeFs('fs:op', body),
	/** find-in-files -> { results, truncated, total? }. */
	fsSearch: (root: string, q: string, regex: boolean, caseSensitive: boolean) => invokeFs('fs:search', root, q, regex, caseSensitive),
	/** { exists, mtimeMs, size }, used to poll for a freshly-written compile output. */
	fsStat: (path: string) => invokeFs('fs:stat', path),
	synctex: (body: Record<string, unknown>) => invokeFs('synctex:call', body),

	/** per-file git status + branch -> { ok, branch?, entries? }. */
	gitStatus: (root: string) => invokeFs('git:status', root),
	/** committed (HEAD) contents of a file for diffing -> { ok, hasHead, content? }. */
	gitShow: (path: string) => invokeFs('git:show', path),
	gitInit: (dir: string) => invokeFs('git:init', dir),
	/** stage files (empty = all). */
	gitStage: (root: string, paths: string[]) => invokeFs('git:stage', root, paths),
	/** unstage files (empty = all). */
	gitUnstage: (root: string, paths: string[]) => invokeFs('git:unstage', root, paths),
	/** discard unstaged changes to tracked files. */
	gitDiscard: (root: string, paths: string[]) => invokeFs('git:discard', root, paths),
	gitCommit: (root: string, message: string) => invokeFs('git:commit', root, message)
});

// terminal bridge to the node-pty shells in the main process, keyed by a string `id`
contextBridge.exposeInMainWorld('texpileTerminal', {
	/** whether node-pty loaded (false if it needs `pnpm electron:rebuild`). */
	available: () => ipcRenderer.invoke('terminal:available'),
	/** spawn (or reuse) a shell for `id` in `cwd`. Resolves { ok, shell?, error? }. */
	spawn: (opts: { id: string; cwd?: string; cols?: number; rows?: number }) => ipcRenderer.invoke('terminal:spawn', opts),
	/** send keystrokes (append '\r' to run a command). */
	write: (id: string, data: string) => ipcRenderer.send('terminal:input', { id, data }),
	resize: (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
	kill: (id: string) => ipcRenderer.send('terminal:kill', { id }),
	/** subscribe to output; cb gets { id, data }. Returns an unsubscribe fn. */
	onData: (cb: (msg: { id: string; data: string }) => void) => {
		const h = (_e: unknown, msg: { id: string; data: string }) => cb(msg);
		ipcRenderer.on('terminal:data', h);
		return () => ipcRenderer.removeListener('terminal:data', h);
	},
	/** subscribe to shell exit; cb gets { id, code }. Returns an unsubscribe fn. */
	onExit: (cb: (msg: { id: string; code: number }) => void) => {
		const h = (_e: unknown, msg: { id: string; code: number }) => cb(msg);
		ipcRenderer.on('terminal:exit', h);
		return () => ipcRenderer.removeListener('terminal:exit', h);
	}
});
