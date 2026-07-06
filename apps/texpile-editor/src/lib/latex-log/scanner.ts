// TeX hard-wraps log lines at max_print_line (default 79), so a full-width line is a wrapped
// continuation. Exceptions: a "..." ending is TeX eliding, and a "!" line is always a new error.
export class LogScanner {
	private lines: string[];
	private i = -1;

	constructor(text: string, maxPrintLine = 79) {
		const physical = text.replace(/\r\n?/g, '\n').split('\n');
		const joined: string[] = [];
		let current = physical.length > 0 ? physical[0] : '';
		for (let k = 1; k < physical.length; k++) {
			const next = physical[k];
			const tail = current.length % maxPrintLine;
			// current may already be joined; only the trailing segment's length says whether the engine wrapped here
			const lastSegmentFull = current.length > 0 && tail === 0;
			if (lastSegmentFull && !current.endsWith('...') && !next.startsWith('!')) {
				current += next;
			} else {
				joined.push(current);
				current = next;
			}
		}
		joined.push(current);
		this.lines = joined;
	}

	next(): string | null {
		this.i++;
		return this.i < this.lines.length ? this.lines[this.i] : null;
	}

	peek(): string | null {
		return this.i + 1 < this.lines.length ? this.lines[this.i + 1] : null;
	}

	/** un-consumes the last line from next(). */
	rewind(): void {
		if (this.i >= 0) this.i--;
	}

	get done(): boolean {
		return this.i >= this.lines.length - 1;
	}
}
