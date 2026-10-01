import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/*.queries.ts', 'supabase/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/server/**/*.ts', 'packages/**/*.ts', '*.js', '*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
