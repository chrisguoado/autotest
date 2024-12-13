import 'dotenv/config';
import fs from 'fs-extra';
import xlsx from 'node-xlsx';
import HCCrawler from '../lib/js/crawler/index.js';
import { click, input, query } from './common/util.js';
import nopt from '../lib/js/util/nopt.js';
import { createLogger, closeLoggers } from './logger.js';

function help() {
  console.log(``);
  console.log(`Usage:`);
  console.log(`  $ node autotest.js [-?] [-h] [-v] [-c path_of_case(s)]`);
  console.log(``);
  console.log(`Options:`);
  console.log(`  -?, --help           show this help`);
  console.log(`  -h, --help           show this help`);
  console.log(`  -v, --verbose        enable verbose output`);
  console.log(``);
  console.log(`a few examples:`);
  console.log(`  $ node autotest.js -c cases/iot`);
  console.log(`  $ node autotest.js -v -c cases/iot/gateway_management.js`);
  console.log(`  $ node autotest.js`);

  process.exit(1);
}

const knownOpts = {
  help: Boolean,
  verbose: Boolean,
  case: String,
};

const shortHands = {
  '?': ['--help'],
  h: ['--help'],
  v: ['--verbose'],
  c: ['--case'],
};

const options = nopt(knownOpts, shortHands, process.argv, 2, { help });
if (options.help) help();

// case is a key word, and cannot be used as variable name
const { verbose = false, case: cases = 'all' } = options;
if (verbose) process.env.NODE_ENV = 'development';

async function scanCases(dir) {
  dir = dir.replaceAll('\\', '/');
  const isFile = (await fs.lstat(dir)).isFile();

  if (isFile) {
    // remove the 'src/' or './src/' prefix which is necessary for
    // fs.lstat or fs.readdir (based on project's root dir) in IDE
    // env, but is not needed for import() (based on the current js
    // file's path)
    dir = dir.replace(/(^src\/|^\.\/src\/)/g, '');
    return [dir.startsWith('./') ? dir : `./${dir}`];
  }

  const files = (
    await fs.readdir(dir, {
      recursive: true,
      withFileTypes: true,
    })
  )
    .filter((dirent) => dirent.isFile())
    .map((file) => {
      let fsPath = `${file.parentPath}/${file.name}`.replaceAll('\\', '/');
      // in IDE mode, fs.readDir's work dir is the root dir of the work
      // space, but import()'s work dir is the current dir of the file
      // being debugged. here is a workaround to bridge this gap.
      fsPath = fsPath.replace(/(^src\/|^\.\/src\/)/g, '');
      // add './' to the beginning to cope with the requirement of import()
      return fsPath.startsWith('./') ? fsPath : `./${fsPath}`;
    });

  return files;
}

let testCases;
let crawler;

async function consume(num) {
  while (num--) {
    if (testCases.length) {
      // import() only supports paths like './cases/xxx',
      // import not work for paths like 'cases/xxx'
      // eslint-disable-next-line no-await-in-loop
      const { run, config } = await import(
        // './cases/wansheng/device_type_management.js'
        /* webpackIgnore: true */ testCases.shift()
      );

      // eslint-disable-next-line no-await-in-loop
      await crawler.queue({
        url: config.entries[0].url,
        case: { ...config, run },
      });
    } else num = 0;
  }
}

export async function customCrawl(page, crawl, option) {
  const result = await option.case.run.call(this, page, crawl, option);

  await consume(1);
  return result;
}

async function main() {
  if (!fs.existsSync('./log') || !fs.lstatSync('./log').isDirectory()) {
    fs.mkdirSync('./log', { recursive: true });
  }

  // 1. import() function for lazy loading,
  // 2. /* webpackIgnore: true */ bypass the webpack packing process
  // 3. relative path './settings.js' works well here in both webpack and
  // non-webpack env, as well as in both windows and non-windows env.
  const { default: settings } = await import(
    /* webpackIgnore: true */ './settings.js'
  );

  const logger = createLogger({
    ...settings.logOptions,
    name: 'autotest',
    label: 'autotest',
  });

  logger.debug(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);

  const casePath = cases === 'all' ? settings.autotest.casesDir : cases;
  logger.debug(`test target(s): ${casePath}`);

  testCases = await scanCases(casePath);

  crawler = await HCCrawler.launch({
    // if undefined, the internal chromium will be used by default
    executablePath: settings?.autotest?.browserPath,
    headless: settings?.autotest?.headless || false,
    // slowMo: 10,
    ignoreHTTPSErrors: true,
    timeout: 0,
    waitUntil: 'networkidle2',
    // waitUntil: 'domcontentloaded',
    waitFor: { selectorOrFunctionOrTimeout: 500 },
    // resolve a bug for
    //  async _setBypassCSP() {
    //    if (!this._options.jQuery) return;
    //    @ts-ignore
    //    await this._page.setBypassCSP(true);
    //  }
    // !TODO, not to support jquery at this moment to avoid webpack issues
    // ! and cross origin errors
    jQuery: false,
    maxConcurrency: settings?.autotest?.maxConcurrency
      ? settings.autotest.maxConcurrency
      : 10,
    // different test cases may share the same url
    skipDuplicates: false,
    args: [
      ...[
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // '--headless',
        '--disable-gpu',
        '--disable-web-security',
      ],
      ...(settings.autotest.startMaximized ? ['--start-maximized'] : []),
    ],

    // Function to be evaluated in browsers
    evaluatePage: () => ({
      /*
      // eslint-disable-next-line no-undef
      title: $('title').text(),
      // eslint-disable-next-line no-undef
      links: $('a'),
      */
    }),

    customCrawl,

    // Function to be called with evaluated results from browsers
    // called when each url has been processed
    onFinish: (result) => {
      logger.info(
        `project: ${result.case.project}, test case: ${result.case.name}, test status: ${result.case.status}`
      );
    },

    defaultViewport: settings.autotest.viewPort
      ? settings.autotest.viewPort
      : null,

    logger,

    utils: {
      xlsx,
      page: {
        click,
        input,
        query,
      },
    },
  });

  /*
  crawler._browser.on('targetcreated', async () => {
    const pageList = await crawler._browser.pages();
    console.log(pageList.length);
  });
  */

  await consume(settings?.autotest?.maxConcurrency || 1);
  await crawler.onIdle();
  await crawler.close();

  await closeLoggers();
}

main();
