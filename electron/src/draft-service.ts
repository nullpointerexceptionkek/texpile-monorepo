// Draft-mode compile service. Runs the user's own lualatex on their project with a
// job-string that injects the per-page shipout extractor (page-extract.lua) into a
// contained `_draft/` subdir -- the user's source and folder root are never touched.
// Returns each shipped page's exact positioned records (the real engine's layout).
// Same engine, so exact by construction.
import { execFile } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { resolveType1Line } from './font-t1map';

export type DraftPage = { n: number; w: number; h: number; records: string };
export type DraftResult =
	| {
			ok: true;
			ms: number;
			count: number;
			passes: number;
			paperW: number;
			paperH: number;
			colW: number;
			marginX: number;
			marginY: number;
			pages: DraftPage[];
	  }
	| { ok: false; error: string; ms: number; log?: string; superseded?: true };

type DraftBody = { root: string; mainFile: string; engineDir: string; engine?: string };

const OUT = '_draft';

// Cancel-on-supersede: a newer compileDraft kills the in-flight lualatex (via activeChild) so a
// hung/slow compile can't hold the 120s pass timeout and stick the preview -- the editor just
// fires the fresh compile and the stale one bails. compileGen is the monotonic run id; a run is
// superseded once compileGen moves past it.
let compileGen = 0;
let activeChild: import('node:child_process').ChildProcess | null = null;

// TeX places the shipped page's reference point 1in (72.27pt) from the paper's top-left
// by default; the extracted box coords are relative to that point.
const ONE_INCH_PT = 72.27;

// per-root biber control-file hash: biber is slow (~1-3s), so rerun it only when the
// .bcf actually changed (citation set changed), not on every keystroke's recompile
const lastBcf = new Map<string, string>();

function sha1(buf: Buffer | string): string {
	return crypto.createHash('sha1').update(buf).digest('hex');
}
function mtimeOf(p: string): number {
	try {
		return fs.statSync(p).mtimeMs;
	} catch {
		return 0;
	}
}
function run(cmd: string, args: string[], opts: { cwd: string; env?: NodeJS.ProcessEnv }): Promise<void> {
	return new Promise((resolve) => {
		const child = execFile(cmd, args, { ...opts, timeout: 90000, maxBuffer: 16 * 1024 * 1024 }, () => resolve());
		child.on('error', () => resolve()); // tool missing -> citations just stay unresolved
	});
}

// The aux cycle (latexmk-lite): seed a shipped .bbl under the draft jobname, run biber
// (biblatex) when the .bcf changed, or bibtex (\bibdata in the aux) when the .bbl is
// missing/stale. Returns whether the .bbl changed (=> the pass we just ran is stale).
// arXiv-style papers ship <main>.bbl with no .bib; seed it under our jobname so the
// FIRST pass already processes the bibliography (else cites need a third pass)
export function seedBbl(root: string, outAbs: string, mainFile: string): void {
	const bbl = path.join(outAbs, 'draft.bbl');
	// seed candidates: <main>.bbl (arXiv convention), the \bibliography{NAME} arg's NAME.bbl,
	// or a lone .bbl in the root -- shipped bibliographies don't always follow the jobname
	const cands: string[] = [path.join(root, path.basename(mainFile, '.tex') + '.bbl')];
	try {
		const src = fs.readFileSync(path.join(root, mainFile), 'utf8');
		const m = src.match(/\\bibliography\{([^}]+)\}/);
		if (m) for (const b of m[1].split(',')) cands.push(path.join(root, b.trim() + '.bbl'));
	} catch {
		/* main unreadable -> the compile will fail its own way */
	}
	try {
		const all = fs.readdirSync(root).filter((f) => f.endsWith('.bbl'));
		if (all.length === 1) cands.push(path.join(root, all[0]));
	} catch {
		/* ignore */
	}
	const seed = cands.find((c) => {
		try {
			return fs.statSync(c).size > 0;
		} catch {
			return false;
		}
	});
	if (!seed) return;
	// (re)seed when the draft bbl is absent, empty, gutted (no entries -- e.g. clobbered by a
	// failed bibtex), or older than a regenerated seed
	try {
		const cur = fs.existsSync(bbl) ? fs.statSync(bbl) : null;
		const curOk = !!cur && cur.size > 0 && /\\bibitem|\\entry/.test(fs.readFileSync(bbl, 'utf8'));
		if (curOk && cur!.mtimeMs >= fs.statSync(seed).mtimeMs) return;
		fs.copyFileSync(seed, bbl);
	} catch {
		/* ignore */
	}
}

async function auxCycle(root: string, outAbs: string, mainFile: string): Promise<boolean> {
	const bbl = path.join(outAbs, 'draft.bbl');
	const bblBefore = mtimeOf(bbl) + ':' + (fs.existsSync(bbl) ? sha1(fs.readFileSync(bbl)) : '');
	seedBbl(root, outAbs, mainFile);
	const bcf = path.join(outAbs, 'draft.bcf');
	const aux = path.join(outAbs, 'draft.aux');
	const auxText = fs.existsSync(aux) ? fs.readFileSync(aux, 'utf8') : '';
	if (fs.existsSync(bcf)) {
		const h = sha1(fs.readFileSync(bcf));
		if (lastBcf.get(root) !== h) {
			// biblatex: biber reads _draft/draft.bcf; datasource paths in the .bcf are as
			// written in \addbibresource (root-relative), so run from root
			await run('biber', ['--input-directory', OUT, '--output-directory', OUT, 'draft'], { cwd: root });
			lastBcf.set(root, h);
		}
	} else if (/\\bibdata\{/.test(auxText)) {
		// classic bibtex: runs inside the output dir (reads draft.aux there); .bib/.bst
		// live in the project root, reachable via BIBINPUTS/BSTINPUTS (trailing separator
		// keeps the default search paths)
		const bibs = fs
			.readdirSync(root)
			.filter((f) => f.endsWith('.bib'))
			.map((f) => mtimeOf(path.join(root, f)));
		const stale = !fs.existsSync(bbl) || (bibs.length > 0 && Math.max(...bibs) > mtimeOf(bbl));
		if (stale && bibs.length > 0) {
			const prev = fs.existsSync(bbl) ? fs.readFileSync(bbl) : null;
			await run('bibtex', ['draft'], {
				cwd: outAbs,
				env: { ...process.env, BIBINPUTS: root + path.delimiter, BSTINPUTS: root + path.delimiter }
			});
			// a failed bibtex (missing .bst, broken .bib) can leave an empty/gutted bbl and the
			// mtime guards would then keep it forever: never let it clobber a working one
			const ok = fs.existsSync(bbl) && /\\bibitem/.test(fs.readFileSync(bbl, 'utf8'));
			if (!ok && prev && /\\bibitem/.test(prev.toString())) {
				try {
					fs.writeFileSync(bbl, prev);
				} catch {
					/* ignore */
				}
			}
		}
	}
	const bblAfter = mtimeOf(bbl) + ':' + (fs.existsSync(bbl) ? sha1(fs.readFileSync(bbl)) : '');
	return bblAfter !== bblBefore;
}

// refs for the warm daemon's instant patches: \bibcite (natbib citation labels) and
// \newlabel (\ref/\eqref targets) from the resolved aux, plus the .bbl under the
// daemon's jobname so biblatex documents resolve at its \begin{document}
function exportDaemonRefs(outAbs: string): void {
	try {
		const aux = path.join(outAbs, 'draft.aux');
		if (fs.existsSync(aux)) {
			const refs = fs
				.readFileSync(aux, 'utf8')
				.split('\n')
				.filter((l) => /^\\(bibcite|newlabel)\b/.test(l));
			fs.writeFileSync(path.join(outAbs, 'live-refs.tex'), refs.join('\n') + '\n');
		}
		const bbl = path.join(outAbs, 'draft.bbl');
		if (fs.existsSync(bbl)) fs.copyFileSync(bbl, path.join(outAbs, 'texd_daemon.bbl'));
	} catch {
		/* refs are an enhancement, never fail the compile */
	}
}

export async function compileDraft(body: DraftBody): Promise<DraftResult> {
	const { root, mainFile } = body;
	const engineDir = body.engineDir.replace(/\\/g, '/');
	const engine = body.engine || 'lualatex';
	const outAbs = path.join(root, OUT);
	// supersede any in-flight compile: kill its lualatex so this fresh run isn't stuck behind it
	const gen = ++compileGen;
	if (activeChild) {
		try {
			activeChild.kill('SIGKILL');
		} catch {
			/* already gone */
		}
		activeChild = null;
	}
	const superseded = () => gen !== compileGen;
	fs.mkdirSync(outAbs, { recursive: true });
	// self-ignoring build dir: users' projects are usually git repos, and the preview's
	// artifacts must never end up staged in them
	const gi = path.join(outAbs, '.gitignore');
	if (!fs.existsSync(gi)) {
		try {
			fs.writeFileSync(gi, '*\n');
		} catch {
			/* ignore */
		}
	}
	// clear stale page files so a shorter document doesn't keep orphaned pages
	for (const f of fs.readdirSync(outAbs))
		if (/^page-\d+\.jsonl$/.test(f) || f === 'pages.json') {
			try {
				fs.rmSync(path.join(outAbs, f));
			} catch {
				/* ignore */
			}
		}

	// forward-slash the input path for TeX; keep it relative to the compile cwd (root)
	const mainRel = mainFile.replace(/\\/g, '/');
	const setup = `\\directlua{TEXPILE_ENGINE_DIR='${engineDir}'; TEXPILE_DRAFT_OUT='${OUT}'; dofile('${engineDir}/page-extract.lua')}`;
	const hooks = `\\AtBeginDocument{\\AddToHook{shipout/before}{\\directlua{page_extract(\\the\\ShipoutBox)}}\\AtEndDocument{\\directlua{page_extract_finish()}}}`;
	// (The old unicode-math injection is GONE: the engine now typesets classic Type1 math
	// untouched -- exact layout vs the user's own compile -- and the renderer parses the
	// real Type1 fonts and paints their actual outlines.)
	// \pdfoutput is a pdfTeX primitive luatex lacks; many arXiv preambles set it unguarded
	// (\pdfoutput=1) and crash lualatex. Define it as a dummy count if absent so the assignment
	// is a harmless no-op. Injected before \input so it runs before the main preamble; a no-op
	// for docs that never touch it (only defines what isn't there). See PDF_SHIM in draft-daemon.
	const pdfShim = `\\ifdefined\\pdfoutput\\else\\newcount\\pdfoutput\\fi`;
	const job = `${setup}${hooks}${pdfShim}\\input{${mainRel}}`;
	const enginePass = () =>
		new Promise<void>((resolve) => {
			if (superseded()) {
				resolve();
				return;
			} // a newer compile already took over
			const child = execFile(
				engine,
				// -synctex=1 so the instant path can map a source line to its page box (draft.synctex.gz)
				['-no-shell-escape', '-interaction=nonstopmode', '-synctex=1', `-output-directory=${OUT}`, '-jobname=draft', job],
				{ cwd: root, timeout: 120000, maxBuffer: 32 * 1024 * 1024 },
				() => {
					if (activeChild === child) activeChild = null;
					resolve();
				}
			);
			activeChild = child; // a superseding compile kills this to unblock itself
			child.on('error', () => {
				if (activeChild === child) activeChild = null;
				resolve();
			}); // engine not on PATH etc -> handled by the manifest check below
		});

	const t0 = Date.now();
	const auxExisted = fs.existsSync(path.join(outAbs, 'draft.aux'));
	seedBbl(root, outAbs, mainFile);
	await enginePass();
	if (superseded()) return { ok: false, error: 'superseded', ms: Date.now() - t0, superseded: true };
	let passes = 1;
	// aux cycle: bibliography tools + the classic reruns. A changed .bbl needs up to TWO
	// extra passes (classic bibtex chain: bbl read in pass 2 writes \bibcite to the aux,
	// \cite resolves in pass 3); a missing aux (first-ever compile) needs one, so
	// \cite/\ref/\tableofcontents see the freshly written aux/toc. Ordinary text edits
	// keep the .bbl stable (bcf-hash + mtime guards) and stay single-pass.
	const bblChanged = await auxCycle(root, outAbs, mainFile);
	const extra = bblChanged ? 2 : !auxExisted ? 1 : 0;
	for (let i = 0; i < extra && !superseded(); i++) {
		await enginePass();
		passes++;
	}
	if (superseded()) return { ok: false, error: 'superseded', ms: Date.now() - t0, superseded: true };
	exportDaemonRefs(outAbs);
	const ms = Date.now() - t0;

	const manifestPath = path.join(outAbs, 'pages.json');
	if (!fs.existsSync(manifestPath)) {
		let log = '';
		try {
			log = fs
				.readFileSync(path.join(outAbs, 'draft.log'), 'utf8')
				.split('\n')
				.filter((l) => /^!|error/i.test(l))
				.slice(-12)
				.join('\n');
		} catch {
			/* no log */
		}
		return { ok: false, error: 'Draft compile produced no pages (is lualatex on PATH? see _draft/draft.log)', ms, log };
	}

	let manifest: { count: number; paperW?: number; paperH?: number; colW?: number; pages: { n: number; w: number; h: number }[] };
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	} catch (e) {
		return { ok: false, error: 'Draft manifest unreadable: ' + (e instanceof Error ? e.message : String(e)), ms };
	}

	// Resolve figure FILES for image records: the engine's image rule nodes don't expose the
	// filename, but the log records every inclusion as `<use FILE>` followed by
	// "Requested size: WxH" -- match records to files by those exact dimensions. Repeated
	// same-size uses of one file are fine; distinct files at identical sizes fall back to
	// log order (only ever swaps two same-sized figures).
	const imageFiles: { file: string; w: number; h: number; used: boolean }[] = [];
	try {
		const log = fs.readFileSync(path.join(outAbs, 'draft.log'), 'utf8');
		const re = /<use ([^>]+)>[\s\S]{0,300}?Requested size: ([\d.]+)pt x ([\d.]+)pt/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(log))) imageFiles.push({ file: m[1], w: parseFloat(m[2]), h: parseFloat(m[3]), used: false });
	} catch {
		/* no log -> records stay file-less (renderer placeholders) */
	}
	const resolveImage = (w: number, h: number): string | null => {
		const near = (f: { w: number; h: number }) => Math.abs(f.w - w) < 0.1 && Math.abs(f.h - h) < 0.1;
		const hit = imageFiles.find((f) => !f.used && near(f)) ?? imageFiles.find(near);
		if (!hit) return null;
		hit.used = true;
		return (path.isAbsolute(hit.file) ? hit.file : path.join(root, hit.file)).replace(/\\/g, '/');
	};

	const pages: DraftPage[] = [];
	for (let n = 1; n <= manifest.count; n++) {
		const p = path.join(outAbs, `page-${String(n).padStart(3, '0')}.jsonl`);
		const meta = manifest.pages[n - 1] || { w: 0, h: 0 };
		let records = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
		if ((imageFiles.length && records.includes('"t":"image"')) || records.includes('"t":"font"')) {
			records = records
				.split('\n')
				.map((ln) => {
					if (ln.startsWith('{"t":"font"')) return resolveType1Line(ln);
					if (!ln.startsWith('{"t":"image"') || !imageFiles.length) return ln;
					try {
						const r = JSON.parse(ln);
						const file = resolveImage(r.w, (r.h || 0) + (r.d || 0));
						if (file) {
							r.file = file;
							return JSON.stringify(r);
						}
					} catch {
						/* keep the raw line */
					}
					return ln;
				})
				.join('\n');
		}
		pages.push({ n, w: meta.w, h: meta.h, records });
	}

	// some classes never set the engine's page-dimension registers, leaving paperW/H = 0 in the
	// manifest (the preview would render zero-sized pages): fall back to the shipped page BOX
	// dims (always known at shipout) plus the 1in reference margins
	const maxPageW = manifest.pages.length ? Math.max(...manifest.pages.map((p) => p.w || 0)) : 0;
	const maxPageH = manifest.pages.length ? Math.max(...manifest.pages.map((p) => p.h || 0)) : 0;
	return {
		ok: true,
		ms,
		passes,
		count: manifest.count,
		paperW: manifest.paperW || (maxPageW ? maxPageW + 2 * ONE_INCH_PT : 0),
		paperH: manifest.paperH || (maxPageH ? maxPageH + 2 * ONE_INCH_PT : 0),
		colW: manifest.colW || 0,
		marginX: ONE_INCH_PT,
		marginY: ONE_INCH_PT,
		pages
	};
}
