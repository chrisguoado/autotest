/**
 * ===== compile options for webpack and build scripts =====
 * finalized before compiling
 */
export default {
  /**
   * required npm version, for information purpose only, user
   * needs to do the upgrading manually.
   * need npm 8.3.0 or above to enable the overrides feature,
   * which is required in this project. the npmVersion field
   * here is for information purpose only, user needs to do
   * the upgrading manually:
   * to check the current npm version
   *  $ npm -v
   * to upgrade npm:
   *  $ npm install -g npm@latest
   * overrides feature has some bugs. if possible, clean npm cache
   * before npm install
   *  $ npm cache clean -f
   *  $ rm -rf ./node_modules
   *  $ rm ./package-lock.json
   *  $ npm install
   */
  npmVersion: '^8.3.0',

  /**
   * webpack output bundle dir. could be relative (relative to
   * the project dir) or absolute path.
   * !!! make sure to set this dir correctly. before each compile,
   * !!! the build script will empty this directory. so it must
   * !!! not be an dir that contains any other files except the
   * !!! webpack outputs.
   */
  outputDir: 'dist',

  /**
   * SFB(single file bundle) mode. it's very useful when autotest
   * is deployed per user in cloud env. The node_modules directory
   * for each user may have as many as 200,000 files, and with
   * hundreds of users, the number of files would be enormous.
   */
  modeSFB: true,

  /**
   * for SFB(single file bundle) mode.
   *
   * requireReplace is mainly focus on resolving the require
   * expression issues in third party modules. In these cases,
   * webpack will produce warnings like this:
   *   WARNING in ./node_modules/express/lib/view.js 81:13-25
   *   Critical dependency: the request of a dependency is an expression
   *   @ ./node_modules/express/lib/application.js 22:11-28
   *   @ ./node_modules/express/lib/express.js 18:12-36
   *   @ ./node_modules/express/index.js 11:0-41
   *   @ ./src/back/lib/web/index.js 3:16-34
   *   @ ./src/back/nodeflow.js 16:18-38
   *   @ ./src/back/bin/www 6:10-32
   *
   * string-replace-loader is selected to solve the issue. this
   * loader has a big advantage over the replave-in-file solution.
   * it replaces the strings on the fly, leaving the original files
   * untouched.
   *
   * the paths are relative to the project root dir.
   */
  requireReplaces: [
    // for cosmiconfig
    // cannot require('typescript') here, typescript.js has a lot of require()
    // expression in it and makes a big mess with webpack
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      // https://github.com/webpack/webpack/issues/2073
      // [\\/] is for matching paths in both windows and linux env
      // test options could be used to match multiple files simutaneously
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `let importFresh;`,
      to: `const importFresh = require('import-fresh');
      const parseJson = require('parse-json');
      const yaml = require('js-yaml');`,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `let parseJson;`,
      to: ``,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `let yaml;`,
      to: ``,
    },

    // for cosmiconfig
    // remove typescript completely
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `let typescript;`,
      to: ``,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `if (importFresh === undefined) {
        importFresh = require('import-fresh');
    }`,
      to: ``,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `if (parseJson === undefined) {
        parseJson = require('parse-json');
    }`,
      to: ``,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `if (yaml === undefined) {
        yaml = require('js-yaml');
    }`,
      to: ``,
    },

    // for cosmiconfig
    // remove typescript completely
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `if (typescript === undefined) {
        typescript = require('typescript');
    }`,
      to: `throw new Error('loadTsSync is not supported')`,
    },

    // for cosmiconfig
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `return (await import(href)).default;`,
      to: `return (await import( /* webpackIgnore: true */ href)).default;`,
    },

    // for cosmiconfig
    // remove typescript completely
    {
      // files: 'node_modules/puppeteer/node_modules/cosmiconfig/dist/loaders.js',
      test: /node_modules[\\/]cosmiconfig[\\/]dist[\\/]loaders.js/,
      from: `if (typescript === undefined) {
        typescript = (await import('typescript')).default;
    }`,
      to: `throw new Error('loadTs is not supported')`,
    },

    // for import-fresh
    // the filePath should be a local file, should not try to load an module from node_module
    {
      files: 'node_modules/import-fresh/index.js',
      from: `return parent === undefined ? require(filePath) : parent.require(filePath);`,
      to: `return parent === undefined ? __non_webpack_require__(filePath) : parent.require(filePath);`,
    },

    // for picocolors
    {
      files: 'node_modules/picocolors/picocolors.js',
      from: `let argv = process.argv || [],`,
      to: ` const tty = require("tty");
      let argv = process.argv || [],`,
    },

    // for picocolors
    {
      files: 'node_modules/picocolors/picocolors.js',
      from: `require != null && require("tty").isatty(1)`,
      to: `tty.isatty(1)`,
    },

    // for bufferutil
    {
      // files: 'node_modules/puppeteer-core/node_modules/ws/lib/buffer-util.js',
      test: /node_modules[\\/]ws[\\/]lib[\\/]buffer-util.js/,
      from: `/* istanbul ignore else  */
if (!process.env.WS_NO_BUFFER_UTIL) {
  try {
    const bufferUtil = require('bufferutil');

    module.exports.mask = function (source, mask, output, offset, length) {
      if (length < 48) _mask(source, mask, output, offset, length);
      else bufferUtil.mask(source, mask, output, offset, length);
    };

    module.exports.unmask = function (buffer, mask) {
      if (buffer.length < 32) _unmask(buffer, mask);
      else bufferUtil.unmask(buffer, mask);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}`,
      to: ``,
    },

    // for utf-8-validate
    {
      // files: 'node_modules/puppeteer-core/node_modules/ws/lib/validation.js',
      test: /node_modules[\\/]ws[\\/]lib[\\/]validation.js/,
      from: `/* istanbul ignore else  */ else if (!process.env.WS_NO_UTF_8_VALIDATE) {
  try {
    const isValidUTF8 = require('utf-8-validate');

    module.exports.isValidUTF8 = function (buf) {
      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
    };
  } catch (e) {
    // Continue regardless of the error.
  }
}`,
      to: ``,
    },

    // for yargs
    {
      test: /node_modules[\\/]yargs[\\/]build[\\/]index.cjs/,
      from: `h=require.resolve(t.extends)`,
      to: `h=__non_webpack_require__.resolve(t.extends)`,
    },

    // for yargs
    {
      test: /node_modules[\\/]yargs[\\/]build[\\/]index.cjs/,
      from: `:require(t.extends),delete`,
      to: `:__non_webpack_require__(t.extends),delete`,
    },

    // for yargs
    {
      test: /node_modules[\\/]yargs[\\/]build[\\/]index.cjs/,
      from: `require?void 0:require.main`,
      to: `__non_webpack_require__?void 0:require.main`,
    },

    // for yargs
    {
      test: /node_modules[\\/]yargs[\\/]build[\\/]index.cjs/,
      from: `readFileSync:ie,require:require,requireDirectory`,
      to: `readFileSync:ie,require:__non_webpack_require__,requireDirectory`,
    },

    // for yargs
    {
      test: /node_modules[\\/]yargs-parser[\\/]build[\\/]index.cjs/,
      from: `return require(path);`,
      to: `return __non_webpack_require__(path);`,
    },
  ],

  /**
   * to tell webpack how to handle node global
   * TODO. webpack doc says: If you are using a module
   * which needs global variables in it, use ProvidePlugin
   * instead of global
   */
  nodeGlobal: true,

  /**
   * to tell webpack how to handle node __filename
   */
  nodeFilename: true,

  /**
   * to tell webpack how to handle node __dirname
   */
  nodeDirname: true,

  /**
   * webpack stats.errorDetails
   */
  errorDetails: false,
};
