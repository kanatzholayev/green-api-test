import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicorn from 'eslint-plugin-unicorn';
import css from '@eslint/css';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

const sourceFiles = ['src/**/*.{ts,tsx}', 'vite.config.ts'];
const unicornFilenameCase = ['error', { cases: { kebabCase: true, pascalCase: true } }];
const prettierOptions = {
  singleQuote: true,
  jsxSingleQuote: false,
  semi: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  printWidth: 100,
};
const unicornArrows = [
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
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: sourceFiles,
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, unicorn },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'func-style': ['error', 'expression'],
      'unicorn/consistent-function-style': unicornArrows,
      'unicorn/filename-case': unicornFilenameCase,
    },
  },
  {
    files: ['src/**/*.scss'],
    plugins: { css, unicorn },
    language: 'css/css',
    languageOptions: { tolerant: true },
    rules: {
      'unicorn/filename-case': unicornFilenameCase,
      'unicorn/no-duplicate-css-selectors': 'error',
      'unicorn/no-invalid-media-features': 'error',
      'unicorn/prefer-explicit-viewport-units': 'error',
      'unicorn/prefer-media-feature-range-syntax': 'error',
    },
  },
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': ['error', prettierOptions, { usePrettierrc: false }],
    },
  },
);
