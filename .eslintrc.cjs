module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    jest: true
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { 
      devDependencies: ['**/*.test.ts', '**/*.spec.ts', 'vite.config.ts'] 
    }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Chrome Extension에서는 console 사용 필요
    'max-len': ['error', { code: 100, ignoreComments: true }]
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.cjs']
}