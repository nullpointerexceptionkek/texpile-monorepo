// local-only stubs for the image plugin, nothing here touches the network.

/** image refs are already local paths, pass-through. */
export async function getStorageUrl(filePath: string, _forceRefreshToken = false): Promise<string> {
	return filePath;
}

/** no remote storage offline, no-op. */
export async function uploadImage(_filePath: string, _file: File): Promise<void> {
	/* no-op */
}

/** no cross-document copy offline, source path kept as-is. */
export async function copyImage(sourcePath: string, _destDocId: string, _destOwnerId: string): Promise<string> {
	return sourcePath;
}
