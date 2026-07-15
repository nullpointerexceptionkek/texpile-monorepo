declare global {
	/** injected by Vite `define` from package.json. */
	const __APP_VERSION__: string;

	/** injected by Vite `define`: every released CHANGELOG.md entry, newest first. */
	const __WHATS_NEW__: { version: string; date?: string; notes: string[] }[];

	namespace App {
		interface DocMeta {
			title: string;
			folderId: string;
			docref: string;
			created: number;
			updated: number;
			contentPreview: string;
			ownerUserId?: string; // optional for back-compat
		}
		interface Folder {
			id: string;
			name: string;
			parent: string;
			children: string[];
		}
	}

	interface TexpileTerminalBridge {
		/** False if node-pty failed to load (needs `pnpm electron:rebuild`). */
		available(): Promise<boolean>;
		/** Spawn or reuse a shell for `id` in `cwd`. `shell` is the executable's basename (e.g. "cmd.exe"). */
		spawn(opts: { id: string; cwd?: string; cols?: number; rows?: number }): Promise<{ ok: boolean; shell?: string; error?: string }>;
		/** Send keystrokes / a command (append '\r' to run). */
		write(id: string, data: string): void;
		resize(id: string, cols: number, rows: number): void;
		kill(id: string): void;
		/** Subscribe to output; returns an unsubscribe fn. */
		onData(cb: (msg: { id: string; data: string }) => void): () => void;
		/** Subscribe to shell exit; returns an unsubscribe fn. */
		onExit(cb: (msg: { id: string; code: number }) => void): () => void;
	}

	interface Window {
		texpile: {
			debug: boolean;
		};
		MathfieldElement: typeof import('mathlive').MathfieldElement;
		mathVirtualKeyboard: import('mathlive').VirtualKeyboardInterface;
		/** Interactive terminal bridge (Electron only; undefined in the browser dev server). */
		texpileTerminal?: TexpileTerminalBridge;
	}
}

export {};
