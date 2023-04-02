/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript/recommended',
    'prettier',
    '@vue/eslint-config-prettier',
    './.eslintrc-auto-import.json',
  ],
  env: {
    'vue/setup-compiler-macros': true,
    node: true,
    commonjs: true,
  },
  rules: {
    'prettier/prettier': ['error', { semi: true, singleQuote: true, printWidth: 120 }],
    'vue/multi-word-component-names': 'off',
    'no-empty-source': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
