module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: ['prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  parser: 'babel-eslint',
  // add your custom rules here
  rules: {
    'no-unused-vars': 'off',
    'no-console': 'off',
  },
}
