// curated key-value completions for known argument slots (LaTeX Workshop's "keyPos"/"keys"
// mechanism, scaled down: a small hand-maintained table instead of ~250 CTAN package JSON files).
// each rule matches the text-to-cursor; the LAST comma-separated token inside the match is what
// gets replaced (see lastListToken in completion/shared.ts).
export interface ArgKeyRule {
	name: string;
	/** matches text-to-cursor; must end right where the key list starts or continues. */
	trigger: RegExp;
	options: string[];
}

const STANDARD_CLASS_OPTIONS = [
	'10pt',
	'11pt',
	'12pt',
	'a4paper',
	'a5paper',
	'b5paper',
	'letterpaper',
	'legalpaper',
	'executivepaper',
	'landscape',
	'oneside',
	'twoside',
	'onecolumn',
	'twocolumn',
	'draft',
	'final',
	'titlepage',
	'notitlepage',
	'openright',
	'openany',
	'leqno',
	'fleqn'
];

// rules whose value list doesn't depend on which package/class is involved
export const ARG_KEY_RULES: ArgKeyRule[] = [
	{
		name: 'documentclass-options',
		trigger: /\\documentclass\[[^\]]*$/,
		options: STANDARD_CLASS_OPTIONS
	},
	{
		name: 'includegraphics-keys',
		trigger: /\\(?:includegraphics|includesvg)\*?\[[^\]]*$/,
		options: [
			'width=',
			'height=',
			'scale=',
			'angle=',
			'trim=',
			'clip',
			'keepaspectratio',
			'page=',
			'viewport=',
			'bb=',
			'natwidth=',
			'natheight='
		]
	},
	{
		name: 'hypersetup-keys',
		trigger: /\\hypersetup\{[^}]*$/,
		options: [
			'colorlinks=true',
			'colorlinks=false',
			'linkcolor=',
			'citecolor=',
			'urlcolor=',
			'filecolor=',
			'pdftitle=',
			'pdfauthor=',
			'pdfsubject=',
			'pdfkeywords=',
			'bookmarks=true',
			'bookmarks=false',
			'bookmarksnumbered=true',
			'bookmarksopen=true',
			'hidelinks',
			'breaklinks=true',
			'pdfnewwindow=true'
		]
	},
	{
		name: 'geometry-keys',
		trigger: /\\geometry\{[^}]*$/,
		options: [
			'margin=',
			'top=',
			'bottom=',
			'left=',
			'right=',
			'paperwidth=',
			'paperheight=',
			'a4paper',
			'letterpaper',
			'landscape',
			'includeheadfoot',
			'showframe'
		]
	},
	{
		name: 'pagestyle',
		trigger: /\\(?:pagestyle|thispagestyle)\{[^}]*$/,
		options: ['empty', 'plain', 'headings', 'myheadings', 'fancy']
	},
	{
		name: 'pagenumbering',
		trigger: /\\pagenumbering\{[^}]*$/,
		options: ['arabic', 'roman', 'Roman', 'alph', 'Alph', 'gobble']
	},
	{
		name: 'theoremstyle',
		trigger: /\\theoremstyle\{[^}]*$/,
		options: ['plain', 'definition', 'remark']
	}
];

// \usepackage[...]{pkgname}'s options DO depend on pkgname, which the cursor may still be to the
// LEFT of while typing (options come first) — matchBefore can't see text after the cursor, so
// these are resolved from the whole line's text, not folded into a single lookahead-based regex.
export const USEPACKAGE_OPTION_KEYS: Record<string, string[]> = {
	hyperref: ['colorlinks', 'hidelinks', 'breaklinks', 'pdfusetitle', 'unicode', 'bookmarks'],
	natbib: [
		'round',
		'square',
		'curly',
		'angle',
		'semicolon',
		'colon',
		'comma',
		'authoryear',
		'numbers',
		'super',
		'sort',
		'sort&compress',
		'longnamesfirst',
		'sectionbib'
	],
	biblatex: [
		'backend=biber',
		'backend=bibtex',
		'style=numeric',
		'style=authoryear',
		'style=alphabetic',
		'style=authortitle',
		'style=verbose',
		'sorting=nty',
		'sorting=nyt',
		'sorting=nyvt',
		'sorting=ynt',
		'sorting=none',
		'maxnames=',
		'minnames=',
		'dashed=false',
		'doi=false',
		'isbn=false',
		'url=false'
	],
	babel: [
		'english',
		'american',
		'british',
		'french',
		'ngerman',
		'german',
		'spanish',
		'italian',
		'portuguese',
		'dutch',
		'russian',
		'japanese',
		'chinese',
		'korean'
	],
	xcolor: ['dvips', 'pdftex', 'xetex', 'luatex', 'dvipdfmx', 'dvipsnames', 'svgnames', 'x11names']
	// inputenc / fontenc are filled in at use-site from data/encodings.ts to avoid duplicating those lists
};
