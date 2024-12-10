import path from 'path';
import util from 'util';
import fs from 'fs-extra';
import debug from 'debug';
import webpack from 'webpack';
import WebpackBar from 'webpackbar';
import TerserPlugin from 'terser-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { merge } from 'webpack-merge';
import nodeExternals from 'webpack-node-externals';
import FileManagerPlugin from 'filemanager-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';
// import Dotenv from 'dotenv-webpack';
import settings from './settings.js';
import replace from './webpack.replace.js';

// typescript.js uses a lot of require() expression in the code, we are supposed
// to see a bunch of warnings like:
//   WARNING in ./node_modules/typescript/lib/typescript.js 8386:27-46
//   Critical dependency: the request of a dependency is an expression
// ref to https://github.com/microsoft/TypeScript/issues/39436 for more info
// const noParse = /typescript/;
// replace.module.noParse = noParse;

// noParse yargs to suppress warning messages
// const noParse = /yargs/;
// replace.module.noParse = noParse;

const outputDir = settings.outputDir || './dist';

export default merge(
  settings.modeSFB
    ? replace
    : {
        // module: { noParse },
      },
  {
    name: 'autotest',
    mode: 'production',
    devtool: settings.backSourceMap,
    stats: {
      errorDetails: settings.errorDetails,
    },

    target: 'node20.14', // in order to ignore built-in modules like path, fs, etc.
    // this option is for webpack 5+ only
    // in order to ignore built-in modules like path, fs, etc.
    externalsPresets: { node: true },
    // in order to ignore all modules in node_modules folder
    externals: settings.modeSFB
      ? [
          // puppeteer depends on ws, ws internally use bufferutil.
          // in file node_modules/puppeteer-core/node_modules/ws/lib/buffer-util.js:
          // if (!process.env.WS_NO_BUFFER_UTIL) {
          // try {
          // const bufferUtil = require('bufferutil');
          //
          // module.exports.mask = function (source, mask, output, offset, length) {
          // if (length < 48) _mask(source, mask, output, offset, length);
          //   else bufferUtil.mask(source, mask, output, offset, length);
          // };
          //
          // module.exports.unmask = function (buffer, mask) {
          // if (buffer.length < 32) _unmask(buffer, mask);
          // else bufferUtil.unmask(buffer, mask);
          // };
          // } catch (e) {
          // Continue regardless of the error.
          // }
          // }
          //
          // ws use env vars to control whether bufferutil/utf-8-valiadate is used.
          // we can define a process.env.WS_NO_BUFFER_UTIL=false in .env file, or
          // we can use string-replace-loader webpack plugin to remove this code
          // snippet completely(defined in settings.js)
          //
          // yargs is used for parsing command line agrs by puppeteer cli, and it
          // produces a few warnings about "Critical dependency: the request of a
          // dependency is an expression". we don't need puppeteer cli here, so
          // just ignore this module by marking it as external
          // 'yargs/yargs',
          // 'yargs-parser',
        ]
      : [nodeExternals()],

    node: {
      global: settings.nodeGlobal,
      __filename: settings.nodeFilename,
      __dirname: settings.nodeDirname,
    },

    entry: {
      autotest: './src/main.js',
    },

    experiments: {
      outputModule: true,
    },

    output: {
      // filename: "[name].[contenthash:8].min.js",
      // chunkFilename: "[name].[contenthash:8].min.js",
      filename: '[name].js',
      chunkFilename: '[name].js',
      // sourceMapFilename: 'js/[name].min.js.map',
      path: path.resolve(outputDir),
      // libraryTarget: 'commonjs2',
      library: {
        type: 'module',
      },
    },

    optimization: {
      // by default,
      //   in dev build, moduleIds and chunkIds are set to "deterministic"
      //   in prod build, moduleIds and chunkIds are set to "named"
      // as a result, you are supposed to get some file names like "172.min.js"
      // for lazy loaded javascript files in production environment. This type
      // of deterministic names are not friendly. Here we use "named" in both
      // builds, and we will add hash in file names as well in prod build.
      // moduleIds: 'deterministic',
      // chunkIds: 'deterministic',
      moduleIds: 'named',
      chunkIds: 'named',
      minimize: true,
      minimizer: [new TerserPlugin()],
      // forbid replacing process.env variables during compilation in webpack
      // by this way, we get an opportunity to change process.env.NODE_ENV at
      // runtime
      nodeEnv: false,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.cjs', '.mjs', '.scss'],
      alias: {
        '@': path.resolve('src'),
        '@root': path.resolve('./'),
      },
    },

    module: {
      rules: [
        {
          test: /(\.m?js|www)$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              // {modules: false} tells Babel to leave modules alone, not
              // to convert import statements to require, and to let webpack
              // use its own built-in ESM system
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      node: 'current',
                    },
                  },
                ],
              ],
            },
          },
          resolve: {
            // disable the enforcement for file extensions
            // so you can do
            //   import './src/App'
            // instead of
            //   import './src/App.mjs'
            fullySpecified: false,
          },
        },

        {
          test: /(\.ts|\.tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        },
      ],
    },

    plugins: [
      new WebpackBar({
        name: 'autotest',
      }),
      // new Dotenv(),

      // no matter how IgnorePlugin is configured, it's never be able to
      // make webpack ignore a specific require. IgnorePlugin always produces
      // an "MODULE NOT FOUND" error in the final bundle, which is definitely
      // not expected.
      // new webpack.IgnorePlugin({resourceRegExp: /\.(s?[ac]ss|less)$/}),
      /*
    new webpack.IgnorePlugin({
      checkResource(resource, context) {
        const isCss = /\.(s?[ac]ss|less)$/.test(resource);
        const isSettings = /settings([.]m?js)?$/.test(resource);
        return isCss || isSettings;
      },
    }),
    */

      new webpack.BannerPlugin('require("source-map-support").install();', {
        raw: true,
        entryOnly: false,
      }),

      new ESLintPlugin({}),

      // this plugin is not able to copy empty dirs due to webpack limitation
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve('./src/cases'),
            to: path.resolve(outputDir, 'cases'),
            // Using the filter feature we can have more fine-grained control
            // than globOptions.ignore
            // filter: async (resourcePath) =>
            //  !resourcePath.includes('src/cases/sample'),
            toType: 'dir',
            noErrorOnMissing: true,
            globOptions: {
              ignore: [
                // Ignore all dirs/files in cases/sample
                // '**/src/cases/sample/**/*',
              ],
            },
            // minimized: true is trying to tell webpack this file has been minimized
            // already somewhere else, please don't minimize it again (by TerserPlugin).
            // by this way, we simply copy the files to destination "as is" without
            // evaluating and minimizing them using Terser.
            info: { minimized: true },
          },

          {
            from: path.resolve('./src/common'),
            to: path.resolve(outputDir, 'common'),
            toType: 'dir',
            noErrorOnMissing: true,
            globOptions: {},
            info: { minimized: true },
          },

          {
            from: path.resolve('./src/settings.js'),
            to: path.resolve(outputDir, 'settings.js'),
            toType: 'file',
            globOptions: {},
            info: { minimized: true },
          },

          {
            from: path.resolve('./src/.env'),
            to: path.resolve(outputDir, '.env'),
            toType: 'file',
            globOptions: {},
            info: { minimized: true },
          },

          {
            from: path.resolve('./package.json'),
            to: path.resolve(outputDir, 'package.json'),
            toType: 'file',
            globOptions: {},
            info: { minimized: true },
          },
        ],
      }),
    ],
  }
);
