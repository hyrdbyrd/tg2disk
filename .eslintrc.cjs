/** @type { import("eslint").Linter.Config } */
module.exports = {
	root: true,
	extends: ['prettier', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte'],
	},
	rules: {
		indent: ['error', 'space'],
	},
	env: {
		node: true,
		es2017: true,
	},
};
