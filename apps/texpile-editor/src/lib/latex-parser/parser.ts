import { unified, type Plugin } from 'unified';
import { unifiedLatexFromString, unifiedLatexAstComplier, getParser } from '@unified-latex/unified-latex-util-parse';
import type { Root, Node, Argument } from '@unified-latex/unified-latex-types';
import type { ParseOptions, LatexAst } from './types';

// @unified-latex plugins are built against unified@10, this app uses @11: the Plugin<> generics
// don't structurally match though the runtime contract is the same. cast via `unknown` first so
// it stays a type erasure of a known shape, not an open hole.
type UnifiedLatexPluginOptions = Pick<ParseOptions, 'mode' | 'macros' | 'environments' | 'flags'>;
type UnifiedLatexFromStringPlugin = Plugin<[UnifiedLatexPluginOptions], string, Root>;
type UnifiedLatexAstComplierPlugin = Plugin<[], Root, Root>;

export function parseLatex(source: string, options: ParseOptions = {}): LatexAst {
	const processor = unified()
		.use(unifiedLatexFromString as unknown as UnifiedLatexFromStringPlugin, {
			mode: options.mode,
			macros: options.macros,
			environments: options.environments,
			flags: options.flags
		})
		.use(unifiedLatexAstComplier as unknown as UnifiedLatexAstComplierPlugin);

	const result = processor.processSync(source);
	return result.result as Root;
}

/** parse math-mode content (no $ delimiters). */
export function parseLatexMath(source: string, options: Omit<ParseOptions, 'mode'> = {}): LatexAst {
	return parseLatex(source, { ...options, mode: 'math' });
}

/** reusable parser with fixed options; cheaper than parseLatex per call. */
export function createLatexParser(options: ParseOptions = {}): (source: string) => LatexAst {
	const parser = getParser({
		mode: options.mode,
		macros: options.macros,
		environments: options.environments,
		flags: options.flags
	});

	return (source: string): LatexAst => {
		return parser.parse(source);
	};
}

export function debugPrintAst(ast: Root | Node | Argument | (Node | Argument)[], indent: number = 0): string {
	const pad = '  '.repeat(indent);

	if (Array.isArray(ast)) {
		return ast.map((node) => debugPrintAst(node, indent)).join('\n');
	}

	const node = ast;
	let result = `${pad}${node.type}`;

	switch (node.type) {
		case 'string':
			result += `: "${node.content}"`;
			break;
		case 'macro':
			result += `: \\${node.content}`;
			if (node.args && node.args.length > 0) {
				result += '\n' + node.args.map((arg) => debugPrintAst(arg, indent + 1)).join('\n');
			}
			break;
		case 'environment':
			result += `: ${node.env}`;
			if ('content' in node && Array.isArray(node.content)) {
				result += '\n' + debugPrintAst(node.content, indent + 1);
			}
			break;
		case 'inlinemath':
		case 'displaymath':
		case 'group':
		case 'root':
			if ('content' in node && Array.isArray(node.content)) {
				result += '\n' + debugPrintAst(node.content, indent + 1);
			}
			break;
		case 'argument':
			result += ` [${node.openMark}...${node.closeMark}]`;
			if ('content' in node && Array.isArray(node.content)) {
				result += '\n' + debugPrintAst(node.content, indent + 1);
			}
			break;
		case 'comment':
			result += `: % ${node.content}`;
			break;
		case 'whitespace':
		case 'parbreak':
			break;
	}

	return result;
}
