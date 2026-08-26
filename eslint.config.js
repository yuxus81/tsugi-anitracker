import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Bewusst schlank: geprüft wird, was still falsche Werte rendern oder
 * Endlosschleifen bauen kann — nicht Formatierungsgeschmack. Stilfragen
 * kosten hier nur Lärm.
 */
export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'design-lab', 'playwright-report', 'test-results'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',

      // Ungenutzte Variablen sind meist Reste eines halben Umbaus. Ein
      // führender Unterstrich sagt „absichtlich ungenutzt".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` ist erlaubt, aber sichtbar — es soll auffallen, nicht blockieren.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Fängt `if (entry)` auf einem Promise und ähnliche stille Wahrheitsfallen.
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Werkzeugskripte laufen unter Node, nicht im Browser.
    files: ['**/*.mjs', '*.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
);
