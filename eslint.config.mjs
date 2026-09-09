import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

const browserGlobals = Object.fromEntries([
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance',
  'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'CustomEvent',
  'Event', 'HTMLElement', 'HTMLButtonElement', 'HTMLDialogElement', 'HTMLFormElement',
  'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLCanvasElement',
  'FormData', 'URL', 'URLSearchParams', 'fetch', 'AbortController', 'console',
  'Image', 'getComputedStyle', 'Node', 'Element', 'DOMException'
].map(name => [name, 'readonly']));

export default [
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', 'assets/**', 'css/**', 'js/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['src/**/*.{ts,js,astro}'],
    languageOptions: { globals: browserGlobals },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] }
    }
  }
];
