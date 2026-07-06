// source <-> PDF sync via the synctex binary over Electron IPC; needs a -synctex=1 compile
import { native } from './fileSystem';

// flat shapes (not discriminated unions) so callers can read fields without narrowing;
// on failure ok is false and the position fields are absent
export interface ForwardResult {
	ok: boolean;
	error?: string;
	page: number;
	x: number;
	y: number;
	h: number;
	v: number;
	width: number;
	height: number;
}

export interface InverseResult {
	ok: boolean;
	error?: string;
	input: string;
	line: number;
	column: number;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
	const n = native();
	if (!n) return { ok: false, error: 'SyncTeX requires the Texpile desktop app.' } as T;
	try {
		return (await n.synctex(body)) as T;
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) } as T;
	}
}

/** forward sync: a source position (absolute .tex path + 1-based line) -> a PDF location. */
export function synctexForward(pdf: string, tex: string, line: number, column = 0): Promise<ForwardResult> {
	return call<ForwardResult>({ action: 'view', pdf, tex, line, column });
}

/** inverse sync: a PDF location (1-based page + x,y in PDF points) -> the source file + 1-based line. */
export function synctexInverse(pdf: string, page: number, x: number, y: number): Promise<InverseResult> {
	return call<InverseResult>({ action: 'edit', pdf, page, x, y });
}
