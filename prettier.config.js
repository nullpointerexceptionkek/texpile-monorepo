/**
 * @see https://prettier.io/docs/options
 * @type {import('prettier').Config}
 */
export default {
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [
		{
			files: '*.svelte',
			options: {
				parser: 'svelte'
			}
		}
	],
	printWidth: 140,
	singleQuote: true,
	useTabs: true,
	trailingComma: 'none',
	// keep each file's existing line endings; autocrlf checkouts are CRLF on Windows
	endOfLine: 'auto'
};
