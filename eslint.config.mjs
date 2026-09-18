export default [{
  files: ['js/**/*.js', 'tests/**/*.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { document: 'readonly', window: 'readonly', location: 'readonly', history: 'readonly', URLSearchParams: 'readonly', Intl: 'readonly', fetch: 'readonly', console: 'readonly', require: 'readonly', module: 'readonly', process: 'readonly', structuredClone: 'readonly' } },
  rules: { 'no-undef': 'error', 'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrors: 'none'}], 'eqeqeq': 'error', 'no-eval': 'error' }
}];
