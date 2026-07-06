// git backing for the Source Control panel. Kept out of fs-service.ts so that module stays
// dependency-free; every function returns { ok, reason|error } and never throws
import { simpleGit, type SimpleGit, type FileStatusResult } from 'simple-git';
import { dirname, resolve, relative, join, isAbsolute } from 'node:path';

// once git is confirmed missing (ENOENT), stop retrying
let gitBinaryMissing = false;

// repo membership doesn't change while a folder is open, except git init, which clears this
const repoRootCache = new Map<string, string | null>();

export interface GitStatusEntry {
	/** absolute path, built to match the file-tree's own path strings (fs-service join()). */
	path: string;
	/** index (staged) status char, e.g. 'M'/'A'/'D'/'R'; ' ' if not staged, '?' if untracked. */
	x: string;
	/** working-dir (unstaged) status char; ' ' if clean, '?' if untracked. */
	y: string;
}

export interface GitStatusResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
	branch?: string | null;
	entries?: GitStatusEntry[];
}

export interface GitShowResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
	/** false when the file has no committed baseline (unborn HEAD, or an untracked/new file);
	 *  the caller diffs against empty content. */
	hasHead: boolean;
	content?: string;
}

export interface GitOpResult {
	ok: boolean;
	reason?: 'not-a-repo' | 'no-git';
	error?: string;
}

function git(baseDir: string): SimpleGit {
	return simpleGit({ baseDir, binary: 'git', maxConcurrentProcesses: 4, timeout: { block: 20000 } });
}

function isMissingGit(e: unknown): boolean {
	if ((e as { code?: string })?.code === 'ENOENT') return true;
	const msg = e instanceof Error ? e.message : String(e);
	return /ENOENT|not recognized as|command not found|is not recognized/i.test(msg);
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** resolves the enclosing repo's root, cached. Flat shape (root|null + optional reason), not a
 *  discriminated union: the union form tripped svelte-check's cross-config narrowing. */
async function resolveRepoRoot(dir: string): Promise<{ root: string | null; reason?: 'not-a-repo' | 'no-git' }> {
	if (gitBinaryMissing) return { root: null, reason: 'no-git' };
	// case-fold the cache key only on case-insensitive filesystems; on Linux /proj/Foo
	// and /proj/foo are different directories and must not collide
	const abs = resolve(dir);
	const key = process.platform === 'win32' || process.platform === 'darwin' ? abs.toLowerCase() : abs;
	const cached = repoRootCache.get(key);
	if (cached !== undefined) {
		return cached ? { root: cached } : { root: null, reason: 'not-a-repo' };
	}
	try {
		const g = git(dir);
		// checkIsRepo returns false for a non-repo; it throws ENOENT if git is absent
		if (!(await g.checkIsRepo())) {
			repoRootCache.set(key, null);
			return { root: null, reason: 'not-a-repo' };
		}
		const root = (await g.revparse(['--show-toplevel'])).trim();
		repoRootCache.set(key, root);
		return { root };
	} catch (e) {
		if (isMissingGit(e)) {
			gitBinaryMissing = true;
			return { root: null, reason: 'no-git' };
		}
		// permissions or a corrupt repo: treat as not-a-repo but don't cache, could be transient
		return { root: null, reason: 'not-a-repo' };
	}
}

/** absolute paths to repo-root-relative, forward-slashed (what git's pathspecs want). */
function toRepoRel(repoRoot: string, absPaths: string[]): string[] {
	return absPaths.map((p) => relative(repoRoot, resolve(p)).split(/[\\/]/).join('/'));
}

/** status of every changed file under the workspace + the current branch. Paths are re-derived
 *  against the workspace root to match the file-tree's paths byte-for-byte, which keeps it correct
 *  when the workspace is a subdirectory of a larger repo. */
export async function gitStatus(workspaceRoot: string): Promise<GitStatusResult> {
	if (!workspaceRoot) return { ok: false, error: 'Missing path' };
	const rr = await resolveRepoRoot(workspaceRoot);
	if (!rr.root) return { ok: false, reason: rr.reason };
	const repoRoot = rr.root;
	try {
		const status = await git(workspaceRoot).status(['--untracked-files=all']);
		const wsAbs = resolve(workspaceRoot);
		const entries: GitStatusEntry[] = [];
		for (const f of status.files as FileStatusResult[]) {
			const absFromRepo = resolve(repoRoot, f.path);
			// '' = the workspace root itself; '..'-prefixed = above it; absolute = a different drive
			const rel = relative(wsAbs, absFromRepo);
			if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) continue;
			entries.push({ path: join(workspaceRoot, rel), x: f.index, y: f.working_dir });
		}
		return { ok: true, branch: status.current, entries };
	} catch (e) {
		if (isMissingGit(e)) {
			gitBinaryMissing = true;
			return { ok: false, reason: 'no-git' };
		}
		return { ok: false, error: errMsg(e) };
	}
}

/** committed (HEAD) contents of a file, for diffing against the working copy. */
export async function gitShowHead(absPath: string): Promise<GitShowResult> {
	if (!absPath) return { ok: false, hasHead: false, error: 'Missing path' };
	const rr = await resolveRepoRoot(dirname(absPath));
	if (!rr.root) return { ok: false, hasHead: false, reason: rr.reason };
	const repoRoot = rr.root;
	try {
		const [rel] = toRepoRel(repoRoot, [absPath]);
		const content = await git(repoRoot).show([`HEAD:${rel}`]);
		return { ok: true, hasHead: true, content };
	} catch (e) {
		if (isMissingGit(e)) {
			gitBinaryMissing = true;
			return { ok: false, hasHead: false, reason: 'no-git' };
		}
		const msg = errMsg(e);
		// unborn HEAD, untracked file, or path not in HEAD: no baseline, not an error
		if (/exists on disk, but not in|does not exist in|unknown revision|bad revision|invalid object name|ambiguous argument/i.test(msg)) {
			return { ok: true, hasHead: false, content: '' };
		}
		return { ok: false, hasHead: false, error: msg };
	}
}

/** git init the folder; clears the repo-root cache so subsequent status calls see the new repo. */
export async function gitInit(dir: string): Promise<GitOpResult> {
	if (!dir) return { ok: false, error: 'Missing path' };
	if (gitBinaryMissing) return { ok: false, reason: 'no-git' };
	try {
		await git(dir).init();
		repoRootCache.clear();
		return { ok: true };
	} catch (e) {
		if (isMissingGit(e)) {
			gitBinaryMissing = true;
			return { ok: false, reason: 'no-git' };
		}
		return { ok: false, error: errMsg(e) };
	}
}

/** stage files (git add). Empty `paths` stages everything under the workspace. */
export async function gitStage(workspaceRoot: string, paths: string[]): Promise<GitOpResult> {
	const rr = await resolveRepoRoot(workspaceRoot);
	if (!rr.root) return { ok: false, reason: rr.reason };
	try {
		const rel = toRepoRel(rr.root, paths);
		await git(rr.root).add(rel.length ? rel : ['.']);
		return { ok: true };
	} catch (e) {
		if (isMissingGit(e)) return { ok: false, reason: 'no-git' };
		return { ok: false, error: errMsg(e) };
	}
}

/** unstage files (git reset HEAD). Falls back to `git rm --cached` before the first commit,
 *  since an unborn HEAD can't be reset against. Empty `paths` unstages everything. */
export async function gitUnstage(workspaceRoot: string, paths: string[]): Promise<GitOpResult> {
	const rr = await resolveRepoRoot(workspaceRoot);
	if (!rr.root) return { ok: false, reason: rr.reason };
	const g = git(rr.root);
	const rel = toRepoRel(rr.root, paths);
	try {
		await g.raw(['reset', '-q', 'HEAD', '--', ...(rel.length ? rel : ['.'])]);
		return { ok: true };
	} catch (e) {
		if (isMissingGit(e)) return { ok: false, reason: 'no-git' };
		// no commits yet: reset can't resolve HEAD, remove from the index instead
		try {
			await g.raw(['rm', '-q', '--cached', '-r', '--', ...(rel.length ? rel : ['.'])]);
			return { ok: true };
		} catch (e2) {
			return { ok: false, error: errMsg(e2) };
		}
	}
}

/** discard unstaged changes to tracked files (git checkout). Untracked-file deletion is the
 *  caller's job, via the fs service. */
export async function gitDiscard(workspaceRoot: string, paths: string[]): Promise<GitOpResult> {
	if (!paths.length) return { ok: false, error: 'No files to discard' };
	const rr = await resolveRepoRoot(workspaceRoot);
	if (!rr.root) return { ok: false, reason: rr.reason };
	try {
		const rel = toRepoRel(rr.root, paths);
		await git(rr.root).raw(['checkout', '-q', '--', ...rel]);
		return { ok: true };
	} catch (e) {
		if (isMissingGit(e)) return { ok: false, reason: 'no-git' };
		return { ok: false, error: errMsg(e) };
	}
}

/** commit the staged changes. Fails if nothing is staged or no author identity is configured. */
export async function gitCommit(workspaceRoot: string, message: string): Promise<GitOpResult> {
	if (!message || !message.trim()) return { ok: false, error: 'A commit message is required' };
	const rr = await resolveRepoRoot(workspaceRoot);
	if (!rr.root) return { ok: false, reason: rr.reason };
	try {
		await git(rr.root).commit(message);
		return { ok: true };
	} catch (e) {
		if (isMissingGit(e)) return { ok: false, reason: 'no-git' };
		return { ok: false, error: errMsg(e) };
	}
}
