// mnemonic quick-symbol shortcuts, LaTeX Workshop's "@-suggestions" idea. triggered by typing
// "@" then the mnemonic; `body` uses the same "${1}" tab-stop syntax as CodeMirror snippets.
export interface AtSuggestion {
	prefix: string; // without the leading "@"
	body: string;
	detail: string;
}

export const AT_SUGGESTIONS: AtSuggestion[] = [
	{ prefix: '.', body: '\\cdot', detail: '\\cdot' },
	{ prefix: '*', body: '\\times', detail: '\\times' },
	{ prefix: '/', body: '\\frac{${1}}{${2}}${0}', detail: '\\frac{}{}' },
	{ prefix: '8', body: '\\infty', detail: '\\infty' },
	{ prefix: '0', body: '\\emptyset', detail: '\\emptyset' },
	{ prefix: '6', body: '\\partial', detail: '\\partial' },
	{ prefix: '\\', body: '\\setminus', detail: '\\setminus' },
	{ prefix: '-', body: '\\to', detail: '\\to' },
	{ prefix: '=', body: '\\equiv', detail: '\\equiv' },
	{ prefix: '~', body: '\\sim', detail: '\\sim' },
	{ prefix: '<', body: '\\leq', detail: '\\leq' },
	{ prefix: '>', body: '\\geq', detail: '\\geq' },
	{ prefix: 'a', body: '\\alpha', detail: '\\alpha' },
	{ prefix: 'b', body: '\\beta', detail: '\\beta' },
	{ prefix: 'g', body: '\\gamma', detail: '\\gamma' },
	{ prefix: 'd', body: '\\delta', detail: '\\delta' },
	{ prefix: 'e', body: '\\epsilon', detail: '\\epsilon' },
	{ prefix: 'l', body: '\\lambda', detail: '\\lambda' },
	{ prefix: 's', body: '\\sigma', detail: '\\sigma' },
	{ prefix: 'p', body: '\\pi', detail: '\\pi' },
	{ prefix: 'o', body: '\\omega', detail: '\\omega' },
	{ prefix: 'sum', body: '\\sum_{${1:i=1}}^{${2:n}} ${0}', detail: '\\sum_{}^{}' },
	{ prefix: 'int', body: '\\int_{${1}}^{${2}} ${0} \\, d${3:x}', detail: '\\int_{}^{}' },
	{ prefix: 'lim', body: '\\lim_{${1:x \\to \\infty}} ${0}', detail: '\\lim_{}' },
	{ prefix: 'sq', body: '\\sqrt{${1}}${0}', detail: '\\sqrt{}' },
	{ prefix: '^', body: '\\hat{${1}}${0}', detail: '\\hat{}' },
	{ prefix: 'v', body: '\\vec{${1}}${0}', detail: '\\vec{}' },
	{ prefix: '_', body: '\\bar{${1}}${0}', detail: '\\bar{}' }
];
