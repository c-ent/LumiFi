// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // vendor/ is third-party code kept only so the `file:` override resolves.
    ignores: ['dist/**', 'vendor/**'],
  },
]);
