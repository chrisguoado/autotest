import winston from 'winston';

const defaultLevels = {
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
    // info: 'green',
    info: 'white',
    debug: 'cyan',
    ndbg: 'grey',
    http: 'grey',
    trace: 'blue',
    all: 'magenta',
  },
};

winston.addColors(defaultLevels.colors);

// deprecated
const defaultLevelFilter = (logLevel, setLevel) =>
  defaultLevels.levels[logLevel] <= defaultLevels.levels[setLevel];

// deprecated
function normalizeLevel(level) {
  if (!level) throw new Error('Unsupported level');
  if (typeof level === 'function') {
    return winston.format((info, opts) => (level(info.level) ? info : false))();
  }
  return winston.format((info, opts) =>
    // if the console log is colorized, the info.log would be
    // color escape codes, like '[31merror[39m', in this case
    // we are not able to compare info.level and level. but doc
    // says Symbol.for('level') is treated as immutable by all
    // code and info[Symbol.for('level')] will always be correct.
    defaultLevelFilter(info[Symbol.for('level')], level) ? info : false
  )();
}

export const { levels } = defaultLevels;
