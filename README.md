# autotest

Browser based automated testing framework

## Installation

```
$ git clone https://github.com/bruceon/autotest.git
$ cd autotest
$ npm install
$ npm run build
```

The newly generated `dist` directory will be your working directory. Just follow the case example in `dist/cases/sample` to develop your own cases and place them in the `dist/cases` directory. Afterward, run the following commands to automatically execute all these cases:

```
$ cd dist
$ node autotest.js
```

## Usage

### Command-Line Arguments

You can get detailed usage information through the command-line arguments -h, --help or -?:

```
$ node autotest.js -h
Usage:
  $ node autotest.js [-?] [-h] [-v] [-c path_of_case(s)]

Options:
  -?, --help           show this help
  -h, --help           show this help
  -v, --verbose        enable verbose output

a few examples:
  $ node autotest.js -c cases/iot
  $ node autotest.js -v -c cases/iot/gateway_management.js
  $ node autotest.js
```  

The `-v` option enables verbose mode, which is equivalent to setting `process.env.NODE_ENV="development"` during program execution. Alternatively, the same effect can be achieved by adding the following line to the `.env` file:

```
NODE_ENV='development'
```

The `-c` option is used to specify the target test cases to run. All test cases must be located in the cases directory, which is at the same level as the `autotest.js` file. Each JavaScript file in this folder and its subdirectories is treated as a test case. These test cases can be categorized by test projects and organized into different subfolders, with no limit on the number of folder levels.

The `-c` option can specify either a folder, in which case all test cases in that folder and its subdirectories will be run recursively, or a single JavaScript file, in which case only the specified test case will be executed.

### Configuration Files

There are two main configuration files, `.env` and `settings.js`, which must be placed in the same directory as `autotest.js` so that `autotest.js` can find them during startup. The `.env` file is used to set various environment variables. Currently, the environment variable required by the autotest framework is mainly `NODE_ENV`, which is used to distinguish between development mode and production mode. Different modes affect certain file path settings (related to VSCode IDE, the import() function in node.js, and Webpack's bundling process), and also influence the logging level of the logging tool, thereby affecting the corresponding log outputs.

For this project, the `NODE_ENV` variable essentially has three meaningful values: `"development"`, `"production"`, and `"IDE"`. The value of `NODE_ENV` should only be set to `"IDE"` when debugging the code in the VSCode IDE. In a real production environment, if necessary, you can still set `NODE_ENV` to `"development"`. This is useful for cases where unexpected behavior occurs at runtime, as it allows you to see more log information, making debugging easier.

Compared to the .env file, the settings.js file is more complex. This file mainly handles two aspects of configuration: one is related to the autotest framework itself, and the other is related to the logging tool. The part related to the test framework is as follows:

```
autotest: {
  headless: false,
  maxConcurrency: 10,
  // browserPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  casesDir: process.env.NODE_ENV !== 'IDE' ? './cases' : './src/cases',
},
```

The first configuration option, `headless`, determines whether to use silent mode when running the test cases. The autotest framework is built on top of `Puppeteer`. If headless is set to true, `Puppeteer` will run without launching the browser's graphical interface. Otherwise, the browser will be opened. During development and debugging of test cases, setting this option to `false` is beneficial as it allows us to see the entire execution process of the case. However, in a production environment, setting it to `true` improves the execution efficiency of the test cases and is also easier for integrating the autotest framework into the DevOps pipeline.

The `maxConcurrency` option specifies how many parallel page instances you intend to launch to handle your test cases. In theory, the larger this option is set, the higher the concurrency and efficiency of the testing process. However, this also depends on the resource limitations of the runtime environment and the robustness of the system under test. Generally, setting this option to `10` is appropriate. You can adjust this value based on the specific conditions of your environment.

The `browserPath` option is related to the installation path of the browser. `Puppeteer` comes with a built-in `Chromium` browser. If you do not explicitly specify the `browserPath` parameter, the `autotest` framework will attempt to use `Puppeteer`'s built-in `Chromium` browser. However, the downside is that `Webpack` does not package the `Chromium` browser into the final `autotest.js` during the bundling process. As a result, if `autotest.js` is moved to somewhere outside the development environment for execution, you are highly likely to see the following error:

```
unhandledRejection: Could not find Chrome
```

In such cases, you need to set the `browserPath` option to the correct installation path of your Chrome. An example on windows goes like this:

```
browserPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
```

The directory structures in the IDE environment and the production environment are different. The `casesDir` option is used to inform the autotest framework which directory to retrieve test cases from in each environment. Keep it as is.

The majority of the remaining options in `settings.js` are related to `logging`. They have been carefully tuned, so just keep them as they are.

### Developing Cases

You can refer to the examples in cases/sample to develop your own test cases.

Test cases under the autotest framework have some basic requirements. First, you need to define and export a `config` object. An example of such an object is shown below:

```
export const config = {
  project: 'my_test_project',
  name: 'my_test_case',
  description: 'CRUD of devie type',
  entries: [
    {
      url: 'https://your-server/your-url',
    },
  ]
};
```

In this object, the properties `project`, `name`, `description`, and `entries` are mandatory, while the others are optional. The `entries` array must contain at least one item, and that item must include the `url` property, which serves as the test entry point for the test case. 

Additionally, you need to define a `run` function with the following signature:

```
export async function run(page, crawl, option) {
  ......
  const result = {
    case: {
      project: config.project,
      name: config.name,
      description: config.description,
      status: 'PASS' // maybe 'FAIL'
    }
  };
  ......

  return result;
}
```

The `run` function must return a `result` object as shown above. The parameters `page`, `crawl`, and `option` can be used to construct your test logic. If your case involves interactions across several pages, place the URL of your main entry page in `entries[0]`. After completing the logic for the main entry page, add the dependent page to the execution queue. An example of the `run` function in this situation would be as follows:
```
export async function run(page, crawl, option) {
  ......
  const cur = page.url();
  if (cur.startsWith(config.entries[0].url)) {
    // the test logic for the main entry page
    ......
    this.queue({
      url: config.entries[1].url,
      case: { ...config, run },
    });
  } else if (cur.startsWith(config.entries[1].url)){
    // the test logic for the dependent page
    ......
  }
}
```

In the `run` function, you can reference your own utility functions or code. Simply define these in the `common` directory.

You can use a logging tool provided by `autotest` to output any logs you need at any point:

```
this.logger.debug(`case ${config.name}: login successfully`);
......
this.logger.info(`case ${config.name}: result validated`);
......
this.logger.error(`case ${config.name}: failed to add device into the list`);
```

You can utilize any features of `Puppeteer` as well as some utilities that `autotest` has already prepared for you:

```
// navigate to an element indicated by selector 'input[placeholder="input your password"]',
// focus on it, and input somthing
await input(page, 'input[placeholder="input your password"]', config.entries[0].auth.password)
```

```
// navigate to an element indicated by selector 'xpath/......',
// click on it,
// wait for the route to switch and the new page to fully load.
await click(page, `xpath/.//button[@type='button']/span/span[text()='login']`, true)
```

```
// navigate to an element indicated by selector 'xpath/......',
// click on it, (this will not trigger a route change)
await click(page, `xpath/.//span[text()='add']`)
```

```
// retrieve the value of element indicated by selector 'tbody>......',
const deviceType = await page.$eval('tbody>tr:nth-child(1)>td:nth-child(2) span',
  (item) => item.textContent)
```

## License

MIT

## Acknowledgements

- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [headless-chrome-crawler](https://github.com/yujiosaka/headless-chrome-crawler)
