import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config (ESLint 9+).
 *
 * Layered so each concern is explicit:
 *   1. Ignore generated / non-source paths.
 *   2. Base JS + type-aware TypeScript rules for all source.
 *   3. Playwright-specific lint rules for spec files only.
 *   4. `prettier` last to switch off any rules that conflict with formatting,
 *      keeping ESLint focused on correctness and Prettier on style.
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      '.auth/**',
      '.ai/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Allow intentional `_`-prefixed unused vars (e.g. ignored fixture args).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Playwright best-practice rules, scoped to test + setup files.
  // The Pact contract suite runs under Jest, not Playwright — exclude it.
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts', '**/*.setup.ts'],
    ignores: ['tests/dummyjson/contract/**'],
  },

  // Setup files perform authentication/state setup, not assertions.
  {
    files: ['**/*.setup.ts'],
    rules: {
      'playwright/expect-expect': 'off',
    },
  },

  // CommonJS config + stub files (module.exports / require).
  {
    files: ['jest.config.js', 'tests/**/stubs/**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
  },

  prettier,
);
