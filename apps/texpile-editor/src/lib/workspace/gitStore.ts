// reactive git state for the open folder. refreshed from WorkspaceView's refreshTree()
// (every tree-refresh trigger updates it for free) and after each Source Control write.
import { writable } from 'svelte/store';
import { gitStatus as fetchGitStatus, type GitBadge, type GitStatusEntry } from './git';

export const isGitRepo = writable<boolean>(false);

export const gitBranch = writable<string | null>(null);

/** single-letter badges keyed by gitKey(absolutePath); drives the file tree. */
export const gitStatusMap = writable<Record<string, GitBadge>>({});

/** raw staged/unstaged porcelain codes; drives the Source Control panel. */
export const gitChanges = writable<GitStatusEntry[]>([]);

/** canonical key matching tree paths to badges; guards against separator/casing drift. */
export function gitKey(path: string): string {
	return path.replace(/\\/g, '/').toLowerCase();
}

/** collapses git's two-character XY porcelain code to one badge. x=index (staged), y=working dir. */
export function badgeOf(x: string, y: string): GitBadge {
	if (x === '?' || y === '?') return 'U'; // untracked
	if (x === 'D' || y === 'D') return 'D'; // deleted
	if (x === 'R') return 'R'; // renamed
	if (x === 'A') return 'A'; // added
	return 'M'; // modified / everything else with a change
}

// one-shot per renderer session: show the "git not installed" hint once, then stay quiet
let noGitHintShown = false;
export function takeNoGitHint(): boolean {
	if (noGitHintShown) return false;
	noGitHintShown = true;
	return true;
}

/** refreshes git state for the open folder; never throws. missingGit lets the caller show the install hint. */
export async function refreshGitStatus(root: string | null): Promise<{ missingGit: boolean }> {
	if (!root) {
		isGitRepo.set(false);
		gitBranch.set(null);
		gitStatusMap.set({});
		gitChanges.set([]);
		return { missingGit: false };
	}
	const res = await fetchGitStatus(root);
	if (!res.ok) {
		isGitRepo.set(false);
		gitBranch.set(null);
		gitStatusMap.set({});
		gitChanges.set([]);
		return { missingGit: res.reason === 'no-git' };
	}
	isGitRepo.set(true);
	gitBranch.set(res.branch ?? null);
	const list = res.entries ?? [];
	gitChanges.set(list);
	const map: Record<string, GitBadge> = {};
	for (const e of list) map[gitKey(e.path)] = badgeOf(e.x, e.y);
	gitStatusMap.set(map);
	return { missingGit: false };
}
