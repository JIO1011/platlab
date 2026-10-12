import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // .claude y .agents contienen skills de terceros, no código del producto.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.queries.ts',
      'supabase/**',
      '.claude/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/server/**/*.ts', 'packages/**/*.ts', 'scripts/**/*.mjs', '*.js', '*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Configuración y pruebas de extremo a extremo de la web corren en Node.
    files: ['apps/web/vite.config.ts', 'apps/web/playwright.config.ts', 'apps/web/e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
