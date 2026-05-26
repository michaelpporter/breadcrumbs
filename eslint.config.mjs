// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import only_warn from 'eslint-plugin-only-warn';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import plugin_import from 'eslint-plugin-import-x';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
	{
		ignores: ['npm/', 'node_modules/', 'main.js', '**/*.svelte', '**/*.d.ts'],
	},
	// Strip `import` plugin from obsidianmd recommended — we use import-x which registers the same namespace
	...obsidianmd.configs.recommended.map((c) => {
		if (!c.plugins || !('import' in c.plugins)) return c;
		const { import: _dropped, ...rest } = c.plugins;
		return { ...c, plugins: rest };
	}),
	...eslintPluginSvelte.configs['flat/recommended'],
	...eslintPluginSvelte.configs['flat/prettier'],
	{
		files: ['src/**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		plugins: {
			// @ts-ignore
			'only-warn': only_warn,
			import: plugin_import,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': ['warn'],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],

			'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
			'import/order': [
				'error',
				{
					'newlines-between': 'never',
					alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
				},
			],

			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/restrict-template-expressions': 'off',

			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-base-to-string': 'off',
		},
	},
	{
		// Dataview API types are externally unresolvable — suppress unsafe-* rules for these files
		files: [
			'src/external/dataview/**/*.ts',
			'src/graph/builders/explicit/dataview_note.ts',
			'src/graph/builders/explicit/list_note.ts',
			'src/graph/builders/index.ts',
			'src/codeblocks/index.ts',
		],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
		},
	},
);