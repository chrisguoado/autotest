const path = require('path');

module.exports = {
  root: true,
  // eslint uses node-glob internally, By default, node-glob
  // will not match files and folders beginning with a .(dot)
  // (https://github.com/isaacs/node-glob#dots). so in order to
  // automatically eslint files like .prettierrc.js or .stylelintrc.js,
  // we have to add a '!.*' ignore pattern to the ignorePatterns
  // list, this tells eslint that anything starts with a dot should
  // not be ignored.
  //   https://github.com/microsoft/vscode-eslint/issues/550
  //   https://github.com/eslint/eslint/issues/4828
  ignorePatterns: ['.vscode/**/*', 'dist/**/*', 'node_modules/**/*', '!.*'],
  // configurations for eslint-import-resolver-alias
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', path.resolve('src')],
          ['@db', path.resolve('src/db')],
        ],
        // it looks like the error of missing file extenstion "vue" for ...
        // eslint(import/extensions) will always show up no matter '.vue'
        // is in the extensions list or not. we have to disable that error
        // through:
        // 'import/extensions': [
        //   'error',
        //   'never',
        //   {
        //     ...
        //   },
        //  ],
        extensions: ['.js', '.cjs', '.mjs', '.json', '.node', '.ts'],
      },
    },
  },
  overrides: [
    {
      files: [
        '.eslintrc.*',
        '.prettierrc.*',
        '.stylelintrc.*',
        'babel.config.*',
        'todo.js',
        // 'src/server/bin/www',
        'src/**/*.js',
        'test/**/*.js',
        'lib/**/*.js',
        'build/**/*.js',
      ],
      excludedFiles: ['src/test/**/*.js', 'src/bin/**/*.js'],

      // parser: '@babel/eslint-parser',
      parserOptions: {
        parser: '@babel/eslint-parser',
        ecmaVersion: 'latest',
      },
      env: {
        browser: true,
        node: true,
        es6: true,
        es2021: true,
      },
      extends: ['airbnb-base', 'prettier'],
      rules: {
        // 'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],
        // 'prettier/prettier': 'error',
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'auto',
          },
        ],
        'no-unused-vars': 'off',
        'no-unused-expressions': 'off',
        'no-param-reassign': 'off',
        'global-require': 'off',
        'no-return-assign': 'off',
        'no-restricted-syntax': [
          'error',
          // for-in and for-of is useful in some cases
          // and should be allowed
          /*
          {
            selector: 'ForInStatement',
            message:
              'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
          },
          {
            selector: 'ForOfStatement',
            message:
              'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.',
          },
          */
          {
            selector: 'LabeledStatement',
            message:
              'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
          },
          {
            selector: 'WithStatement',
            message:
              '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
          },
        ],
        /*
        'no-underscore-dangle': [
          'error',
          {
            allow: ['_this'],
            allowAfterThis: false,
            allowAfterSuper: false,
            allowAfterThisConstructor: false,
            enforceInMethodNames: true,
            allowFunctionParams: true,
          },
        ],
        */
        'no-underscore-dangle': 'off',
        'no-plusplus': 'off',
        'no-promise-executor-return': 'off',
        'consistent-return': 'off',
        // 'no-console': 'off',
        // 'no-prototype-builtins': 'off',
        'no-bitwise': 'off',
        'class-methods-use-this': 'off',
        radix: 'off',
        'import/prefer-default-export': 'off',
        'import/extensions': 'off',
        // 'import/extensions': ['error', { js: 'always', json: 'always' }],
        'no-console': 'off',
        'no-restricted-globals': ['error', 'event', 'fdescribe'],
        'import/no-relative-packages': 'off',
        'no-multi-assign': 'off',
        'no-cond-assign': 'off',
      },
      plugins: ['prettier'],
    },

    {
      files: ['src/bin/**/*.js'],

      parser: '@babel/eslint-parser',
      parserOptions: {
        ecmaVersion: 'latest',
      },
      env: {
        browser: true,
        node: true,
        es6: true,
        es2021: true,
      },
      extends: ['airbnb-base', 'prettier'],
      rules: {
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'auto',
          },
        ],
        'no-unused-vars': 'off',
        'no-unused-expressions': 'off',
        'no-param-reassign': 'off',
        'global-require': 'off',
        'no-return-assign': 'off',
        'no-restricted-syntax': [
          'error',
          {
            selector: 'LabeledStatement',
            message:
              'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
          },
          {
            selector: 'WithStatement',
            message:
              '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
          },
        ],
        'no-underscore-dangle': 'off',
        'no-plusplus': 'off',
        'no-promise-executor-return': 'off',
        'consistent-return': 'off',
        'no-console': 'off',
        'no-prototype-builtins': 'off',
      },
      plugins: ['prettier'],
    },

    {
      files: ['./**/*.html'],

      parserOptions: {
        parser: '@babel/eslint-parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      env: {
        browser: true,
        node: true,
        es6: true,
        es2021: true,
      },
      extends: ['prettier'],
      rules: {
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'auto',
          },
        ],
      },
      plugins: ['html', 'prettier'],
    },

    {
      files: ['build/**/*', 'test/**/*.js'],

      parser: '@babel/eslint-parser',
      parserOptions: {
        ecmaVersion: 'latest',
      },
      env: {
        browser: true,
        node: true,
        es6: true,
        es2021: true,
      },
      extends: ['airbnb-base', 'prettier'],
      rules: {
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'auto',
          },
        ],
        'no-unused-vars': 'off',
        'no-unused-expressions': 'off',
        'no-param-reassign': 'off',
        'global-require': 'off',
        'no-return-assign': 'off',
        'no-restricted-syntax': [
          'error',
          {
            selector: 'LabeledStatement',
            message:
              'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
          },
          {
            selector: 'WithStatement',
            message:
              '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
          },
        ],
        'no-underscore-dangle': 'off',
        'no-plusplus': 'off',
        'no-promise-executor-return': 'off',
        'consistent-return': 'off',
        'import/no-extraneous-dependencies': 'off',
        'no-console': 'off',
        'no-prototype-builtins': 'off',
        'import/extensions': 'off',
        'import/prefer-default-export': 'off',
      },
      plugins: ['prettier'],
    },

    {
      files: ['package.json', 'package-lock.json', 'test/**/*.json'],
      extends: ['plugin:json/recommended', 'prettier'],
      rules: {
        'prettier/prettier': [
          'error',
          {
            endOfLine: 'auto',
          },
        ],
        'json/*': ['error', { allowComments: true }],
      },
      plugins: ['json', 'prettier'],
    },
  ],
};
