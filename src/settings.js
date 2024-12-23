import path from 'path';

// default levels are defined in './lib/log/winston/level'
// user defined log levels go here:
const levels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    ndbg: 5, // for logs from node.js debug module
    http: 5, // for http logs from morgan or similar
    trace: 6,
    all: 7,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'white',
    debug: 'cyan',
    ndbg: 'grey',
    http: 'grey',
    trace: 'blue',
    all: 'magenta',
  },
};

// filter out logs that should not be output
function filter(info) {
  const level = info[Symbol.for('level')];
  const { exception, message } = info;
  // if (level === 'trace') return false;
  // not output the log produced by 'throw' happened in exit()
  if (
    exception &&
    (message.includes('uncaughtException: @__INTENTION_EXIT__@') ||
      message.includes('unhandledRejection: @__INTENTION_EXIT__@'))
  )
    return false;
  return true;
}

/**
 * options for the test framework
 */
export default {
  autotest: {
    headless: false,
    // there is one about:blank tab should be kept for queue rolling, 
    // so if you want to open 10 tabs for working, you have to set 
    // maxConcurrency to 11, and in order to make autotest start working,
    // you have to set maxConcurrency to something >=2. 
    maxConcurrency: 11,
    // browserPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    startMaximized: true,
    incognito: false,
    /*
    viewPort: {
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
    },
    */
    casesDir: process.env.NODE_ENV !== 'IDE' ? './cases' : './src/cases',
  },

  /**
   * running env, development or production, not used at this moment
   */
  mode: 'production',

  // only for morgan logger, not used at this moment
  morgan: {
    format: 'dev',
    source: 'http',
    level: 'http',
    colorizeMessage: false,
  },

  /**
   * api request timeout, not used at this moment
   * all types of tiemout or expiry options support:
   * 1. string, specified with unit of M(month), w(week), d(day),
   *    h(hour), m(minute), s(second)
   * 2. integer, specified in milliseconds
   */
  reqTimeout: 2000,

  logOptions: {
    // default log name
    name: 'global',

    // default log label
    label: 'global',

    /**
     * log level (inherited by all transports)
     */
    level: process.env.NODE_ENV === 'production' ? 'info' : 'ndbg',

    /**
     * log levels, level 'ndbg' and 'http' must be included, 'ndbg'
     * is for piping node.js debug logs, and 'http' is for piping
     * morgan logs
     */
    levels,

    // default timestamp format (time zone UTC):
    // 2022-03-22 01:11:10Z
    // this is inherited by all transports, however, each transport
    // can define its own timestamp and override the one defined here.
    // three types of timestamp are acceptable:
    // 1.a fully customizable function like the one below.
    // 2.a timestamp string follows the rules of fecha:
    //   https://github.com/taylorhakes/fecha, something like:
    //   timestamp: 'YY-MM-DDTHH:mm:ss.SSSZ'
    // 3.if timestamp is not defined, a default value will be assigned:
    //   timestamp: new Date().toISOString()
    //   it is UTC time and an example is as follows:
    //   2022-03-22T14:38:51.961Z
    timestamp() {
      return new Date()
        .toISOString()
        .replace(/\.\d+Z/, 'Z')
        .replace(/(\d)T(\d)/, '$1 $2');
    },

    // enabling splat support on top level. splat feature is something
    // like util.format('this is number %d', 10). the winston doc gives
    // a few examples:
    //
    //   info: test message my string {}
    //   logger.log('info', 'test message %s', 'my string');
    //
    //   info: test message 123 {}
    //   logger.log('info', 'test message %d', 123);
    //
    //   info: test message first second {number: 123}
    //   logger.log('info', 'test message %s, %s', 'first', 'second', { number: 123 });
    //
    // a useful use case would be customizing label for each log message, e.g.:
    //   logger.debug('log with dynamical label', {label: 'something'});
    // would produce a log with a lable of 'something':
    //   2022-03-22 18:41:10Z [something] [DEBUG]: log with dynamical label
    //
    // define splat either in parent level or transport level.
    // defining splat in both level seems not to make any sense.
    splat: true,

    // not calling process.exit() when catching an uncaughtException
    exitOnError: false,

    /**
     * options for node.js debug, indicate:
     * 1. whether pipe node.js debug logs into winston
     * 2. if enable piping, provide the source name as well, so
     *    winston gets a chance to differentiate node.js debug
     *    logs from others produced by morgan, winston itself, ...
     * 3. whether keep the original color of node.js debug logs
     *    in winston
     * 4. how to map the namespace based node.js debug logs to
     *    different log levels in winston. for example,
     *    use warn = debug('nodeflow:gate:@warn@') to indicate the
     *    logs produced by 'warn', like warn('this is a warn msg')
     *    would be matched to 'warn' level logs by winston
     * 5. how to remove tags (tags are usually included in namespace,
     *    which is used to reach the goal of step 4) from the final
     *    logs. for example, the tag in namespace 'nodeflow:gate:@warn@'
     *    would be ':@warn@', and defining a removeTag property tell
     *    winston to remove the tag in the final output. the tag will
     *    be left untouched by winston if removeTag is
     *    not provided (undefined).
     */
    ndbgOptions: {
      // piping node.js debug logs is enabled by default, user has
      // the discretion to enable or disable piping at any time by
      // calling the following two apis:
      //   pipeNdbg(logger, options)
      //   unpipeNdbg()
      pipeNdbg: true,
      source: 'ndbg',
      keepColor: false,
      /*
      mapLevel(namespace) {
        const levelNames = Object.getOwnPropertyNames(levels.levels);
        return levelNames.find((item) => namespace.endsWith(`:@${item}@`));
      },
      removeTag(source, level) {
        return source.replace(`:@${level}@`, '');
      },
      */
    },

    // predefined transports include console, file, error and rotate
    transports: [
      {
        // transport name is necessary for log flush when app exits.
        // winston has some bugs in coping with flushing when exiting,
        // transport name is part of our solution to fix these bugs.
        // so, it is always needed.
        name: 'console',
        // type is to help find the correct format and winston transport
        // constructor. it's always needed.
        type: 'console',
        // colorizeLine: true,
        colorizeTimestamp: true,
        colorizeLabel: true,
        colorizeLevel: true,
        colorizeMessage: true,

        // it's better to define level both in parent scope and in each
        // transport, otherwise, winston will use level 'info' for this
        // transport by default, when mixing this situation will the
        // parent.level, it always leads to a malfunction, no matter you
        // define levelFilter or not.
        level: process.env.NODE_ENV === 'production' ? 'info' : 'ndbg',
        ctrlNewline: true,
        // splat: true,
        handleExceptions: true,
        handleRejections: true,

        // filter out logs
        filter,

        // define the trailing newline of each logging message
        // this is only configurable on transport level, no way
        // to set eol on message level, unless customizing your
        // own transport.
        // eol: '',
      },
      {
        name: 'file',
        type: 'file',
        // dynamically modify filename based on real requirement
        filename: path.resolve('log/all.log'),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'ndbg',
        ctrlNewline: true,
        handleExceptions: true,
        handleRejections: true,

        // filter out logs
        filter,

        // eol: '',
      },
      {
        name: 'error',
        type: 'file',
        // dynamically modify filename based on real requirement
        filename: path.resolve('log/error.log'),
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'warn',
        ctrlNewline: true,
        // splat: true,
        handleExceptions: true,
        handleRejections: true,

        // filter out logs
        filter,

        // eol: '',
      },
      {
        name: 'rotate',
        type: 'rotate',
        // dynamically modify filename based on real requirement
        filename: path.resolve('log/all_%DATE%.log'),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'ndbg',
        ctrlNewline: true,
        // splat: true,
        handleExceptions: true,
        handleRejections: true,

        // filter out logs
        filter,

        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        // eol: '',
      },
    ],
  },
};
