// symbol/outline extraction: a flat text scan producing the same shape as LaTeX Workshop's
// document-symbol tree (sections + a few notable environments), for a future Source-mode outline
// panel. NOT wired to any UI yet — Texpile's existing TableOfContents.svelte reads the WYSIWYG
// doc via tocStore/editorViewStore, and pointing a Source-mode panel at this would need its own
// store plus a jump-by-offset affordance in WorkspaceView; deferred, see the parity report.
export interface OutlineItem {
	kind: 'section' | 'environment';
	level: number; // 1 = part, 2 = chapter, ... 5 = subsubsection; environments get level 6
	text: string;
	pos: number;
}

const SECTION_LEVELS = ['part', 'chapter', 'section', 'subsection', 'subsubsection'];
const SECTION_RE = new RegExp(`\\\\(${SECTION_LEVELS.join('|')})\\*?\\{`, 'g');
const NOTABLE_ENV_RE = /\\begin\{(figure|table|algorithm)\*?\}/g;

function balancedTitle(text: string, openBrace: number): string {
	let depth = 0;
	for (let i = openBrace; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}') {
			depth--;
			if (depth === 0)
				return text
					.slice(openBrace + 1, i)
					.replace(/\\[a-zA-Z]+\s*/g, '') // drop inline macro names ("\textbf")...
					.replace(/[{}]/g, '') // ...and the now-orphaned braces around their argument
					.replace(/\s+/g, ' ')
					.trim();
		}
	}
	return '';
}

/** extracts a flat, position-ordered outline of sections and a few notable environments. */
export function extractOutline(text: string): OutlineItem[] {
	const items: OutlineItem[] = [];

	SECTION_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = SECTION_RE.exec(text))) {
		const openBrace = m.index + m[0].length - 1;
		items.push({
			kind: 'section',
			level: SECTION_LEVELS.indexOf(m[1]) + 1,
			text: balancedTitle(text, openBrace) || m[1],
			pos: m.index
		});
	}

	NOTABLE_ENV_RE.lastIndex = 0;
	while ((m = NOTABLE_ENV_RE.exec(text))) items.push({ kind: 'environment', level: 6, text: m[1], pos: m.index });

	return items.sort((a, b) => a.pos - b.pos);
}
