import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicorn from 'eslint-plugin-unicorn';
import css from '@eslint/css';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

const sourceFiles = ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'vite.config.ts'];
const unicornFilenameCase = ['error', { cases: { kebabCase: true, pascalCase: true } }];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: sourceFiles,
    extends: [js.configs.recommended, ...tseslint.configs.recommended, unicorn.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'func-style': ['error', 'expression'],
      'unicorn/consistent-function-style': [
        'error',
        {
          default: 'arrow-function',
          defaultExport: 'arrow-function',
          namedFunctions: 'arrow-function',
          namedExports: 'arrow-function',
          callbacks: 'arrow-function',
          objectProperties: 'arrow-function',
          reassignedVariables: 'arrow-function',
          typedVariables: 'arrow-function',
        },
      ],
      'unicorn/filename-case': unicornFilenameCase,
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-await': 'off',
      'unicorn/no-top-level-assignment-in-function': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/prefer-split-limit': 'off',
      'unicorn/no-array-sort': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'unicorn/prefer-https': 'off' },
  },
  {
    files: ['src/**/*.scss'],
    plugins: { css, unicorn },
    language: 'css/css',
    languageOptions: { tolerant: true },
    rules: {
      'unicorn/filename-case': unicornFilenameCase,
      'unicorn/no-deprecated-css-features': 'error',
      'unicorn/no-duplicate-css-selectors': 'error',
      'unicorn/no-duplicate-font-family-names': 'error',
      'unicorn/no-empty-file': 'error',
      'unicorn/no-invalid-media-features': 'error',
      'unicorn/no-missing-local-resource': 'error',
      'unicorn/no-nesting-with-mixed-specificity': 'error',
      'unicorn/no-redundant-nested-style-rules': 'error',
      'unicorn/no-shorthand-property-overrides': 'error',
      'unicorn/no-transition-all': 'error',
      'unicorn/no-unknown-css-annotations': 'error',
      'unicorn/no-unknown-pseudo-selectors': 'off',
      'unicorn/no-unscoped-css-nesting-selector': 'error',
      'unicorn/prefer-explicit-viewport-units': 'error',
      'unicorn/prefer-https': 'error',
      'unicorn/prefer-media-feature-range-syntax': 'error',
      'unicorn/text-encoding-identifier-case': 'error',
    },
  },
  prettierRecommended,
);
