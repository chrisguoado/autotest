/*
 * usage:
 * const debug = require('./path-to-debug/debug')('domain1:domain2');
 * const error = require('./path-to-debug/debug')('domain1:domain2', 'error');
 * debug("the length of %s is: %d", str, 10);
 * error("error message: %s, error code: %d", err, 500);
 */

import createDebug from 'debug';
import util from 'util';

const fnLog = createDebug.log;
const fnFormatArgs = createDebug.formatArgs;

function formatArgs(args) {
  const name = this.namespace;
  const useColors = true;
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const dateLocal = new Date(now.getTime() - offsetMs);
  // add two leading spaces for line-2 ~ line-n when
  // the log is a multiple-line message
  const space = '  ';
  const str = dateLocal
    .toISOString()
    .slice(0, 19)
    .replace(/-/g, '/')
    .replace('T', ' - ');
  const dateTime = `[${str}]`;
  let prefix = '';

  if (useColors) {
    const c = this.color;
    const colorCode = `\u001b[3${c < 8 ? c : `8;5;${c}`}`;
    // prefix = ` ${colorCode};1m${name} ` + `\u001b[0m`;
    // args[0] = dateTime + prefix + args[0].split('\n').join('\n' + space + prefix);
    prefix = `${colorCode};1m${name} \u001b[0m`;

    // args[0] = prefix + args[0].split('\n').join(`\n${space}${prefix}`);
    // remove the namespace prefix for line-2 ~ line-n when
    // the log is a multiple-line message. if line-2 ~ line-n
    // form a json object, it's better to add a line separate
    // char between line-1 and line-2, like this:
    //   debug(`create a new knex with config:\n${JSON.stringify(config, null, 2)}`);
    // by this way, the json object will be formated well (from
    // line-2 ~ line-n)
    args[0] = prefix + args[0].split('\n').join(`\n${space}`);
    args.push(`${colorCode}m+${createDebug.humanize(this.diff)}\u001b[0m`);
  } else {
    prefix = ` ${name} `;
    // args[0] = dateTime + prefix + args[0].split('\n').join('\n' + space + prefix);
    args[0] = prefix + args[0].split('\n').join(`\n${space}${prefix}`);
    args.push(createDebug.humanize(this.diff));
  }
}

function formatNdbg() {
  createDebug.formatArgs = formatArgs;
}

function restoreNdbg() {
  createDebug.formatArgs = fnFormatArgs;
}

function wrapForLog(logger, options) {
  function log(...args) {
    /*
    // const levelNames = Object.getOwnPropertyNames(levels);
    let level = levelNames.find((item) =>
      this.namespace.endsWith(`:@${item}@`)
    );

    let levelSign;

    // for un-tagged logs, set the level to 'ndebug', indicating logs
    // coming from node.js debug module
    if (!level) level = 'ndbg';
    else levelSign = `:@${level}@`;
    */
    let level;
    const { source, keepColor, mapLevel, removeTag } = options || {};
    if (!mapLevel) level = 'ndbg';
    else if (typeof mapLevel === 'function') level = mapLevel(this.namespace);
    else if (mapLevel[this.namespace]) level = mapLevel[this.namespace];
    else level = 'ndbg';

    if (!level) level = 'ndbg';

    // we can remove the special signs from the message produced by debug,
    // but it's better to leave it. it reminds us that this message was
    // produced by debug, not winston.
    // if (args[0] && levelSign) args[0] = args[0].replace(levelSign, '');
    if (removeTag && typeof removeTag === 'function' && args[0])
      args[0] = removeTag(args[0], level);

    // reove namespace from message if necessary
    /*
    if (args[0]) {
      args[0] = args[0].replace(
        new RegExp(`\\s*${this.namespace}\\s*`, 'g'),
        ''
      );
    }
    */

    // logger[level](util.format(...args).trim());
    // providing as much information as poosible to winstone for
    // further improvement
    logger.log({
      source,
      level,
      namespace: this.namespace,
      colorized: true,
      keepColor,
      message: util.format(...args).trim(),
    });
  }

  return log;
}

function pipeNdbg(logger, options) {
  // formatNdbg();
  createDebug.log = wrapForLog(logger, options);
}

function unpipeNdbg() {
  // restoreNdbg();
  createDebug.log = fnLog;
}

function updateNdbg(namespaces) {
  if (namespaces) createDebug.enable(namespaces);
  else createDebug.enable('');
}

// if logger has not been defined, any logger.info, logger.debug...
// calls will trigger an exception. if this is the case, catch
// these function calls through a proxy, and internally invoke
// debug() instead
const proxyNdbg = (
  namespace,
  levels = [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'ndbg',
    'http',
    'trace',
    'all',
    'log',
  ]
) => {
  if (!levels.includes('log')) levels.push('log');

  formatNdbg();
  return new Proxy(createDebug(namespace), {
    get(trapTarget, key, receiver) {
      if (!levels.includes(key)) {
        throw new TypeError(`Property ${key} doesn't exist.`);
      }
      return trapTarget;
    },
  });
};

/*
module.exports = (domain, level) =>
  level ? debug(`${domain}:@${level}@`) : debug(`${domain}`);
 */
export { pipeNdbg, unpipeNdbg, updateNdbg, formatNdbg, restoreNdbg, proxyNdbg };
