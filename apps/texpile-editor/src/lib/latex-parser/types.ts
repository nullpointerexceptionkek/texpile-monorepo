import type * as Ast from '@unified-latex/unified-latex-types';

export interface ParseOptions {
	/** 'math' parses math-mode content. */
	mode?: 'regular' | 'math';

	/** macro name (no backslash) to argument signature. */
	macros?: Ast.MacroInfoRecord;

	environments?: Ast.EnvInfoRecord;

	flags?: {
		/** parse @ as a letter, as if \makeatletter is set. */
		atLetter?: boolean;

		/** parse _ and : as letters, as if \ExplSyntaxOn is set. */
		expl3?: boolean;

		/** autodetect macros that look like they need @, _, or :. */
		autodetectExpl3AndAtLetter?: boolean;
	};
}

export type LatexAst = Ast.Root;

export type LatexNode = Ast.Node;

export type MathNode = Ast.InlineMath | Ast.DisplayMath;

export type EnvironmentNode = Ast.Environment;

export type MacroNode = Ast.Macro;
