// The visual editor's workspace file access, injected by WorkspaceView from the active
// workspace provider so extensions never touch the disk client directly: a guest session
// resolves URLs from the shared doc's blob cache and uploads through the session instead.

let resolveUrl: ((path: string) => string) | null = null;
let writeBinary: ((path: string, data: Blob) => Promise<void>) | null = null;

export function setEditorFileAccess(
	resolve: ((path: string) => string) | null,
	write: ((path: string, data: Blob) => Promise<void>) | null
): void {
	resolveUrl = resolve;
	writeBinary = write;
}

/** bytes URL for a workspace path; '' outside a workspace (img just stays broken). */
export const editorFileUrl = (path: string): string => resolveUrl?.(path) ?? '';

export async function editorWriteBinary(path: string, data: Blob): Promise<void> {
	if (!writeBinary) throw new Error('No workspace to write to');
	await writeBinary(path, data);
}
