interface ParsedBibTeXEntry {
	citationKey: string;
	entryType: string;
	entryTags: Record<string, string>;
}

/**
 * File-order token stream from parse(). Comment/preamble/string blocks are verbatim so the
 * serializer can round-trip them; entries carry their raw source range plus hasInlineComment.
 */
export type BibToken =
	| { kind: 'entry'; entry: ParsedBibTeXEntry; raw: string; hasInlineComment: boolean }
	| { kind: 'comment'; text: string } //   `%…\n`  OR  `@Comment{…}`
	| { kind: 'preamble'; text: string } // `@Preamble{…}`
	| { kind: 'string'; text: string }; //   `@String{name = "value"}`

class BibtexParser {
	private months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
	// terminators for bare tokens (keys, field names, unquoted values). newline/tab/CR must stay
	// in this list: "month = may\n}" otherwise sweeps the \n into the value and derails the whole file
	private notKey = [',', '{', '}', ' ', '=', '\n', '\r', '\t'];
	private pos = 0;
	private input = '';
	private tokens: BibToken[] = [];
	private currentEntry: Partial<ParsedBibTeXEntry> = {};
	/** true while parsing an entry body, routes % detection to hasInlineComment. */
	private insideEntry = false;
	/** set when skipWhitespace swallows a % inside the current entry's body. */
	private currentHasInlineComment = false;

	setInput(text: string): void {
		this.input = text;
		this.pos = 0;
		this.tokens = [];
		this.insideEntry = false;
		this.currentHasInlineComment = false;
	}

	getEntries(): ParsedBibTeXEntry[] {
		return this.tokens.filter((t): t is Extract<BibToken, { kind: 'entry' }> => t.kind === 'entry').map((t) => t.entry);
	}

	getTokens(): BibToken[] {
		return this.tokens;
	}

	private isWhitespace(char: string): boolean {
		return char === ' ' || char === '\r' || char === '\t' || char === '\n';
	}

	// consume the closing } WITHOUT swallowing trailing % comments: matchAt reads
	// inter-block comments as tokens, skipping past them here would lose them
	private closeBlock(): void {
		this.skipWhitespace(true);
		if (this.input[this.pos] === '}') {
			this.pos++;
		} else {
			throw new TypeError(`Token mismatch: expected "}", found "${this.input.substring(this.pos, this.pos + 10)}"`);
		}
	}

	private match(str: string, canCommentOut = true): void {
		this.skipWhitespace(canCommentOut);
		if (this.input.substring(this.pos, this.pos + str.length) === str) {
			this.pos += str.length;
		} else {
			throw new TypeError(`Token mismatch: expected "${str}", found "${this.input.substring(this.pos, this.pos + 10)}"`);
		}
		this.skipWhitespace(canCommentOut);
	}

	private tryMatch(str: string, canCommentOut = true): boolean {
		this.skipWhitespace(canCommentOut);
		return this.input.substring(this.pos, this.pos + str.length) === str;
	}

	/** scan to the next @, capturing lone % lines as comment tokens (between-entry comments must round-trip). */
	private matchAt(): boolean {
		while (this.input.length > this.pos && this.input[this.pos] !== '@') {
			if (this.input[this.pos] === '%') {
				const start = this.pos;
				while (this.pos < this.input.length && this.input[this.pos] !== '\n') this.pos++;
				this.tokens.push({ kind: 'comment', text: this.input.substring(start, this.pos) });
			} else {
				this.pos++;
			}
		}
		return this.input[this.pos] === '@';
	}

	private skipWhitespace(canCommentOut: boolean): void {
		while (this.isWhitespace(this.input[this.pos])) {
			this.pos++;
		}
		if (this.input[this.pos] === '%' && canCommentOut) {
			// a % line inside an entry body flags it: the visual form can't round-trip the comment,
			// so the UI demotes the entry to raw. between-entry % is matchAt's job.
			if (this.insideEntry) this.currentHasInlineComment = true;
			while (this.input[this.pos] !== '\n' && this.pos < this.input.length) {
				this.pos++;
			}
			this.skipWhitespace(canCommentOut);
		}
	}

	private valueBraces(): string {
		let braceCount = 0;
		this.match('{', false);
		const start = this.pos;
		let escaped = false;

		while (true) {
			if (!escaped) {
				if (this.input[this.pos] === '}') {
					if (braceCount > 0) {
						braceCount--;
					} else {
						const end = this.pos;
						this.match('}', false);
						return this.input.substring(start, end);
					}
				} else if (this.input[this.pos] === '{') {
					braceCount++;
				} else if (this.pos >= this.input.length - 1) {
					throw new TypeError('Unterminated value (braces)');
				}
			}

			if (this.input[this.pos] === '\\' && !escaped) {
				escaped = true;
			} else {
				escaped = false;
			}
			this.pos++;
		}
	}

	private valueComment(): string {
		let str = '';
		let bracketCount = 0;

		while (!(this.tryMatch('}', false) && bracketCount === 0)) {
			str += this.input[this.pos];
			if (this.input[this.pos] === '{') {
				bracketCount++;
			}
			if (this.input[this.pos] === '}') {
				bracketCount--;
			}
			if (this.pos >= this.input.length - 1) {
				throw new TypeError('Unterminated value (comment)');
			}
			this.pos++;
		}
		return str;
	}

	private valueQuotes(): string {
		this.match('"', false);
		const start = this.pos;
		let escaped = false;

		while (true) {
			if (!escaped) {
				if (this.input[this.pos] === '"') {
					const end = this.pos;
					this.match('"', false);
					return this.input.substring(start, end);
				} else if (this.pos >= this.input.length - 1) {
					throw new TypeError('Unterminated value (quotes)');
				}
			}

			if (this.input[this.pos] === '\\' && !escaped) {
				escaped = true;
			} else {
				escaped = false;
			}
			this.pos++;
		}
	}

	private singleValue(): string {
		const start = this.pos;

		if (this.tryMatch('{')) {
			return this.valueBraces();
		} else if (this.tryMatch('"')) {
			return this.valueQuotes();
		} else {
			const key = this.key();
			if (!key) {
				throw new Error(`Value expected at position ${start}`);
			}
			if (key.match(/^[0-9]+$/)) {
				return key;
			} else if (this.months.indexOf(key.toLowerCase()) >= 0) {
				return key.toLowerCase();
			} else {
				throw new Error(`Value expected at position ${start}, found: "${this.input.substring(start, start + 20)}"`);
			}
		}
	}

	private value(): string {
		const values: string[] = [];
		values.push(this.singleValue());

		while (this.tryMatch('#')) {
			this.match('#');
			values.push(this.singleValue());
		}

		return values.join('');
	}

	private key(optional = false): string | null {
		const start = this.pos;

		while (true) {
			if (this.pos >= this.input.length) {
				throw new TypeError('Runaway key');
			}

			if (this.notKey.indexOf(this.input[this.pos]) >= 0) {
				if (optional && this.input[this.pos] !== ',') {
					this.pos = start;
					return null;
				}
				return this.input.substring(start, this.pos);
			} else {
				this.pos++;
			}
		}
	}

	private keyEqualsValue(): [string, string] {
		const key = this.key();
		if (!key) {
			throw new TypeError('Key expected');
		}

		if (this.tryMatch('=')) {
			this.match('=');
			const val = this.value();
			return [key.trim(), val];
		} else {
			throw new TypeError(`Value expected for key "${key}", equals sign missing`);
		}
	}

	// pure lookahead: does "identifier =" come next rather than the closing "}"? tolerates a missing
	// comma between fields, a common export quirk that would otherwise abort parsing the entire file
	private looksLikeAnotherField(): boolean {
		return /^\s*[^,{}\s=]+\s*=/.test(this.input.slice(this.pos));
	}

	private keyValueList(): void {
		const kv = this.keyEqualsValue();
		this.currentEntry.entryTags = {};
		this.currentEntry.entryTags[kv[0]] = kv[1];

		while (true) {
			if (this.tryMatch(',')) {
				this.match(','); // also skips trailing whitespace, landing right on the next key
				if (this.tryMatch('}')) break;
			} else if (!this.looksLikeAnotherField()) {
				break;
			} else {
				// key() doesn't skip leading whitespace itself (match() does), so skip it
				// here or the next key() call sees the gap and reads ""
				this.skipWhitespace(true);
			}
			const nextKv = this.keyEqualsValue();
			this.currentEntry.entryTags[nextKv[0]] = nextKv[1];
		}
	}

	private entryBody(directive: string): void {
		this.currentEntry = {};
		this.currentEntry.citationKey = this.key(true) || '';
		this.currentEntry.entryType = directive.substring(1);

		if (this.currentEntry.citationKey) {
			this.match(',');
		}

		this.keyValueList();
		// caller (parse()) pushes the token and stamps raw range + hasInlineComment
	}

	private directive(): string {
		this.match('@');
		return '@' + this.key();
	}

	private generateAlternativeCitationKeys(): void {
		for (const token of this.tokens) {
			if (token.kind !== 'entry') continue;
			const entry = token.entry;
			if (!entry.citationKey && entry.entryTags) {
				entry.citationKey = '';
				if (entry.entryTags.author) {
					entry.citationKey += entry.entryTags.author.split(',')[0] + ', ';
				}
				entry.citationKey += entry.entryTags.year || '';
			}
		}
	}

	/** emits the file-order token stream: one token per @block, plus standalone % lines between blocks. */
	parse(): BibToken[] {
		while (this.matchAt()) {
			const tokStart = this.pos; // stamps the raw range from '@' onwards
			const dir = this.directive();
			this.match('{');
			const upper = dir.toUpperCase();

			if (upper === '@STRING') {
				this.valueComment();
				this.closeBlock();
				this.tokens.push({ kind: 'string', text: this.input.substring(tokStart, this.pos) });
			} else if (upper === '@PREAMBLE') {
				this.valueComment();
				this.closeBlock();
				this.tokens.push({ kind: 'preamble', text: this.input.substring(tokStart, this.pos) });
			} else if (upper === '@COMMENT') {
				this.valueComment();
				this.closeBlock();
				this.tokens.push({ kind: 'comment', text: this.input.substring(tokStart, this.pos) });
			} else {
				this.insideEntry = true;
				this.currentHasInlineComment = false;
				this.entryBody(dir);
				this.insideEntry = false;
				this.closeBlock();
				this.tokens.push({
					kind: 'entry',
					entry: this.currentEntry as ParsedBibTeXEntry,
					raw: this.input.substring(tokStart, this.pos),
					hasInlineComment: this.currentHasInlineComment
				});
			}
		}

		this.generateAlternativeCitationKeys();
		return this.tokens;
	}
}

/** parses BibTeX and returns just the entries, for callers that don't need the token stream. */
export function parseBibTeXRaw(bibtexContent: string): ParsedBibTeXEntry[] {
	const parser = new BibtexParser();
	parser.setInput(bibtexContent);
	parser.parse();
	return parser.getEntries();
}

/** parses BibTeX into the file-order token stream used by the round-trip in parser.new.ts. */
export function parseBibTeXTokens(bibtexContent: string): BibToken[] {
	const parser = new BibtexParser();
	parser.setInput(bibtexContent);
	return parser.parse();
}

/** serializes entries back to BibTeX; compact skips the pretty-print indentation. */
export function toBibTeX(entries: ParsedBibTeXEntry[], compact = false): string {
	let output = '';
	const entrySep = compact ? ',' : ',\n';
	const indent = compact ? '' : '    ';

	for (const entry of entries) {
		output += `@${entry.entryType}`;
		output += '{';

		if (entry.citationKey) {
			output += entry.citationKey + entrySep;
		}

		if (entry.entryTags) {
			let tags = indent;
			for (const [key, value] of Object.entries(entry.entryTags)) {
				if (tags.trim().length !== 0) {
					tags += entrySep + indent;
				}
				tags += key + (compact ? '={' : ' = {') + value + '}';
			}
			output += tags;
		}

		output += compact ? '}\n' : '\n}\n\n';
	}

	return output;
}
