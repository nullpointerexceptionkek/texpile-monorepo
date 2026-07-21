// A themed, in-app replacement for window.confirm(). Native dialogs are avoided in Electron: a
// native confirm/alert/prompt is a separate OS window, and closing it leaves Chromium's page-focus
// state desynced, so the editor's caret vanishes and clicks won't refocus until the OS window is
// cycled (alt-tab). Same reason window.prompt was already replaced. Await confirmAsk() anywhere;
// <ConfirmHost/> (mounted once in App) renders it.

interface ConfirmState {
	message: string;
	confirmLabel: string;
	/** label for the decline button; defaults to Cancel. */
	cancelLabel: string | null;
	danger: boolean;
	supersedeValue: boolean;
	/** what Escape / clicking the backdrop resolves to. Default false; asks where the passive
	 *  outcome must be the SAFE one (save-before-switch) pass true, so only the explicit decline
	 *  button ever discards. */
	dismissValue: boolean;
	resolve: (ok: boolean) => void;
}

let current = $state<ConfirmState | null>(null);

export const confirmDialog = {
	get state() {
		return current;
	}
};

/** supersedeValue is what an open ask resolves to if a NEWER ask replaces it before the user
 *  answers. Default false (treat as cancel). Callers where the safe outcome is the affirmative one
 *  (e.g. "save before switching" must never silently discard on rapid switches) pass true. */
export function confirmAsk(
	message: string,
	opts?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean; supersedeValue?: boolean; dismissValue?: boolean }
): Promise<boolean> {
	current?.resolve(current.supersedeValue);
	return new Promise<boolean>((resolve) => {
		current = {
			message,
			confirmLabel: opts?.confirmLabel ?? 'OK',
			cancelLabel: opts?.cancelLabel ?? null,
			danger: opts?.danger ?? false,
			supersedeValue: opts?.supersedeValue ?? false,
			dismissValue: opts?.dismissValue ?? false,
			resolve
		};
	});
}

/** Escape / backdrop click: resolve with the ask's passive-dismissal value. */
export function dismissConfirm(): void {
	const c = current;
	current = null;
	c?.resolve(c.dismissValue);
}

export function answerConfirm(ok: boolean): void {
	const c = current;
	current = null;
	c?.resolve(ok);
}
