import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  js.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  prettierConfig, // Disable ESLint rules that conflict with Prettier
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['e2e/**', 'playwright.config.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      // prettier plugin removed - let Prettier work independently
    },
    rules: {
      'no-unused-vars': 'off', // Turn off base rule as it doesn't understand TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off', // Allow console logs for debugging
      'react/no-unescaped-entities': 'warn',
      // Remove prettier/prettier rule to prevent conflicts - let Prettier handle formatting
      // 'prettier/prettier': 'error', // REMOVED - causes race conditions with format on save
      // Remove quote rules - let Prettier handle all formatting
      // quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }], // REMOVED
      // 'jsx-quotes': ['error', 'prefer-single'], // REMOVED
    },
  },
  // Specific configuration for E2E test files
  {
    files: ['e2e/**/*.{ts,tsx}', 'playwright.config.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.git/**',
      'playwright-report/**',
      'test-results/**',
      '.claude/**',
      'server/dist/**',
      '.deploy-temp/**',
    ],
  },
];

export default config;
