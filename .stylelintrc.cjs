const path = require('path');

module.exports = {
  /*
  extends: [
    // we are mainly use scss style files in this project, enabling
    // stylelint-config-standard rule set makes a mess, which is
    // targeted at css rules only, not sass.
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-prettier',
    'stylelint-config-prettier-scss',
  ],
  */
  overrides: [
    {
      extends: [
        'stylelint-config-html',
        'stylelint-config-prettier',
        // it's not possible to use SASS/SCSS syntax inside html <style> tag
        // configuring stylelint-config-prettier-scss to parse the html file
        // just makes a mess.
        // 'stylelint-config-prettier-scss',
      ],
      files: ['./**/*.html'],
      customSyntax: 'postcss-html',
      rules: {},
      plugins: ['stylelint-prettier'],
    },

    {
      extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
      files: ['./**/*.css'],
      rules: {
        'prettier/prettier': true,
        'comment-no-empty': null,
        'selector-class-pattern': null,
        'no-descending-specificity': null,
        'selector-pseudo-class-no-unknown': null,
        'property-no-unknown': null,
        'block-no-empty': null,
        'property-no-vendor-prefix': null,
      },
      plugins: ['stylelint-prettier'],
    },

    {
      extends: [
        'stylelint-config-standard-scss',
        'stylelint-config-prettier',
        'stylelint-config-prettier-scss',
      ],
      files: ['./**/*.{scss,sass}'],
      customSyntax: 'postcss-scss',
      rules: {
        'prettier/prettier': true,
        /*
        // the following option works fine as well.
        // stylelint-prettier respects the configuration defined in
        // .prettierrc.js
        'prettier/prettier': [
          true,
          { endOfLine: 'auto', singleQuote: true, tabWidth: 2 },
        ],
        */
        'scss/comment-no-empty': null,
        'selector-class-pattern': null,
        'no-descending-specificity': null,
        'scss/at-mixin-pattern': null,
        'scss/dollar-variable-pattern': null,
        'selector-pseudo-class-no-unknown': null,
        'property-no-unknown': null,
        'block-no-empty': null,
        'property-no-vendor-prefix': null,
      },
      plugins: ['stylelint-prettier'],
    },

    // ========== <style> section of vue files ==========
    // stylelint-processor-arbitrary-tags uses a regular expression to
    // identify code within the specified tags (by default, it's <style>,
    // and it's configurable), then passes the code on to stylelint.
    //   https://github.com/mapbox/stylelint-processor-arbitrary-tags
    // everything works fine except autofix. when it comes to autofix,
    // stylelint fixes everything in the code, overwritten the original
    // vue file. however, the code that stylelint is processing is just
    // the <style> section of the vue file, as a result, after autofix,
    // the vue file ends up losing the <template> and <script> sections
    // if it has these parts originally. the stylelint official doc also
    // says "processors are incompatible with the autofix feature".  to
    // workaround this issue, we have to set "source.fixAll.stylelint": false
    // (in editor.codeActionsOnSave section of settings.json) in vscode,
    // to disable autofix for stylelint regarding <style> section of vue
    // files:
    //   "[vue]": {
    //     "editor.defaultFormatter": "octref.vetur",
    //     "editor.codeActionsOnSave": {
    //       "source.fixAll.stylelint": false,
    //     }
    //   },
    // this is defined under [vue] property, so it only poses an impact
    // on vue files. the autofix feature for scss/css files will not
    // be impacted.
    {
      extends: [
        // make sure enabling lang="scss" in vue <style> tag
        'stylelint-config-standard-scss',
        'stylelint-config-prettier',
        'stylelint-config-prettier-scss',
      ],
      processors: ['@mapbox/stylelint-processor-arbitrary-tags'],

      // same as:
      // processors: [
      //   [
      //     '@mapbox/stylelint-processor-arbitrary-tags',
      //     {
      //       startTag: '[^`\'"]<style[\\s\\S]*?>',
      //       endTag: '</\\s*?style>',
      //     },
      //   ],
      // ],

      // here, we cannot use a glob format of 'src/front/**/*.{vue}',
      // otherwise, we will see some strange errors, maybe a bug of
      // stylelint or stylelint-processor-arbitrary-tags.
      files: ['./**/*.ue'],
      customSyntax: 'postcss-scss',
      rules: {
        'prettier/prettier': true,
        // some vue files may not define the <style> tag, only defines
        // the <template> and/or <script> tag(s). this is normal. In this
        // case, stylelint reports a no-empty-source error (because there
        // is no css styles in this vue file). it seems that both vue and
        // stylelint are correct. but actually, this is not a necessary
        // report that we want to see.
        'no-empty-source': null,
        'no-descending-specificity': null,
        'value-keyword-case': null,
        'selector-class-pattern': null,
        'color-function-notation': 'legacy',
        'alpha-value-notation': null,
      },
      plugins: ['stylelint-prettier'],
    },

    // ========== <template> and <style> sections of vue files ==========
    // stylelint-config-standard-vue is an alternative to
    // stylelint-processor-arbitrary-tags.
    // the design intent is good. stylelint-config-standard-vue covers style
    // issues in both <template> and <style> sections of vue files. autofix
    // works fine for vue file as well, at least it keeps the <template> and
    // <script> sections from losing when autofixing.
    // the order of items in extends matters. 'stylelint-config-standard-vue/scss'
    // follows 'stylelint-config-standard-scss', and 'stylelint-config-prettier-scss'
    // always be the last.
    {
      extends: [
        // make sure enabling lang="scss" in vue <style> tag
        'stylelint-config-standard-scss',
        'stylelint-config-standard-vue/scss',
        // 'stylelint-config-prettier',
        'stylelint-config-prettier-scss',
      ],

      files: ['./**/*.vue'],
      // stylelint-config-standard-vue defines its own customsyntax, so we
      // don't need to define it here
      // customSyntax: 'postcss-scss',
      rules: {
        'prettier/prettier': true,
        // some vue files may not define the <style> tag, only defines
        // the <template> and/or <script> tag(s). this is normal. In this
        // case, stylelint reports a no-empty-source error (because there
        // is no css styles in this vue file). it seems that both vue and
        // stylelint are correct. but actually, this is not a necessary
        // report that we want to see.
        'no-empty-source': null,
        'no-descending-specificity': null,
        'value-keyword-case': null,
        'selector-class-pattern': null,
        'color-function-notation': 'legacy',
        'alpha-value-notation': null,
      },
      plugins: ['stylelint-prettier'],
    },
  ],
};
