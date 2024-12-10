import winston from 'winston';
import asyncForEach from 'async/forEach.js';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import formatMap from './format.js';
import { levels as defaultLevels } from './level.js';
import { pipeNdbg, unpipeNdbg } from '../debug.js';
import { get, set, toString } from '../../util/object.js';
import { formatError } from '../../util/error.js';

const debug = createDebug('lib:log:winston');
let levels = defaultLevels;

const transportList = Object.entries(formatMap).reduce((acc, cur) => {
  const [key, value] = cur;
  if (value.Transport) acc.push(key);
  return acc;
}, []);

// winston container does not provide any offical way of getting
// all the loggers from the container at one time. we have to keep
// a copy of all these loggers for elegant-close purpose. in additon,
// we have a discretion to setting level based on transport name by
// keeping a copy of loggers in a self-defined map
// const loggers = new Map();
const loggers = {};

// if getLogger() finds a logger does not exist, usually it will create
// one, except options.oncreate is set, if this is the case, getLogger()
// will return null when the wanted logger is not available at this
// moment and call options.oncreate (it must be a function) to inform
// the caller about the wanted logger once it's created some time later.
const watchList = Object.create(null);

function hasLogger(name) {
  return winston.loggers.has(name);
}

// the way winston handles the logging parameters is super
// unpredictable and makes a big mess. here using proxy to
// trap all logging method and normalize the input parameters
// to make the logging result more preditable
function proxy(targetLogger) {
  const props = [...Object.keys(targetLogger.levels), 'log'].reduce(
    (a, v) => ({ ...a, [v]: true }),
    {}
  );

  return new Proxy(targetLogger, {
    get(target, prop, receiver) {
      if (props[prop]) {
        return function fn(...args) {
          // normalize the logging args

          // delegate the job to winston if:
          // 1. no logging parameters, or
          // 2. just logging a single string, or
          // 3. logging a interpolation string (splat), or
          //   splat: https://github.com/winstonjs/logform/blob/master/splat.js
          // 4. the first parameter is an object containing message property, but not Error
          if (
            !args.length ||
            (typeof args[0] === 'string' &&
              (args.length === 1 || args[0].match(/%[scdjifoO]/g))) ||
            (typeof args[0] === 'object' &&
              args[0] &&
              args[0].message !== undefined &&
              !(args[0] instanceof Error))
          ) {
            return Reflect.apply(target[prop], target, args);
          }

          // otherwise, merge all logging parameters, join them with ', '
          const merge = args
            .map((item) => toString(item))
            // https://stackoverflow.com/questions/19902860/join-strings-with-a-delimiter-only-if-strings-are-not-null-or-empty
            .filter(Boolean)
            .join(', ');

          // invoke the original logging method
          return Reflect.apply(target[prop], target, [merge]);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function getLogger(options) {
  const name = options?.name || 'global';

  // if (winston.loggers.has(name)) return winston.loggers.get(name);
  if (loggers[name]) return loggers[name].logger;

  if (options.oncreate && typeof options.oncreate === 'function') {
    if (watchList[name]) watchList[name].push(options.oncreate);
    else watchList[name] = [options.oncreate];
    return null;
  }

  // self defined levels must include a 'ndbg' level
  // for multiple-loggers cases, all loggers should share the same
  // levels, otherwise, colorization may not work correctly.
  if (options?.levels?.levels && options?.levels?.colors) {
    levels = options.levels.levels;
    winston.addColors(options.levels.colors);
  }

  let { exitOnError } = options;
  if (exitOnError !== false) exitOnError = true;

  /* deprecated
  const logger = winston.createLogger({
    // level,
    // format: winston.format.json(),
    levels,
    ...(options.level && { level: options.level }),
    format: formatMap.general.format(options),
    // defaultMeta: { service: 'user-service' },
    transports: [
      //
      // - Write all loggers with importance level of `error` or less to `error.log`
      // - Write all loggers with importance level of `info` or less to `combined.log`
      //
      // new winston.transports.File({ filename: 'error.log', level: 'error' }),
      // new winston.transports.File({ filename: 'combined.log' }),
    ],
  });
  */
  const logger = winston.loggers.add(name, {
    levels,
    exitOnError,
    ...(options.level && { level: options.level }),
    format: formatMap.general.format(options),
    // defaultMeta: { service: 'user-service' },
    transports: [],
  });

  const bus = new EventEmitter();
  const events = [];

  if (options?.transports) {
    options.transports.forEach((item) => {
      const {
        name: transportName,
        type,
        timestamp,
        filter,
        splat,
        colorizeLine,
        colorizeTimestamp,
        colorizeLabel,
        colorizeLevel,
        colorizeMessage,
        ctrlNewline,
        ...option
      } = item || {};
      // const { name: transportName } = option;

      if (ctrlNewline === true) option.eol = '';

      // ignore undefined format
      if (transportList.includes(type)) {
        const value = formatMap[type];
        option.format = value.format(item);

        let event;
        switch (type) {
          case 'file':
            event = 'open';
            break;
          // if type === rotate, the 'new' event will triggerred many times
          // whenever a rotation is required. and correspondingly, this will
          // lead to the handler registeration statement below being executed
          // many times:
          //    this.once('finish', () =>...
          // and as time goes on, we are supposed to see an warning like this:
          //   MaxListenersExceededWarning: Possible EventEmitter memory leak
          //   detected. 11 finish listeners added to [DailyRotateFile].
          //   Use emitter.setMaxListeners() to increase limit
          // so, we have to use 'once' method to install the 'new' event handler
          // to make sure it will only be triggerred once.
          case 'rotate':
            event = 'new';
            break;
          default:
            event = undefined;
        }

        let transport = new value.Transport(option);
        if (event) {
          const transportEvent = {
            event: `transport-${transportName}-finish`,
            status: 'listening',
          };
          events.push(transportEvent);

          // as described above, here we have to use transport.once instead of
          // transport.on
          transport = transport.once(event, function openHandler() {
            if (this instanceof winston.transports.File) {
              this._dest.once('finish', () => {
                // debug(`file._dest finish, transport: ${transportName}`);
                debug(`logger[${name}]:transport[${transportName}] finished`);
                bus.emit(`transport-${transportName}-finish`);
                // if this event is emitted before closeLoggers() being called,
                // closeLoggers() should be informed about this situation, and
                // transportEvent.status is the way to do informing. this flag
                // will be checked in closeLogger(), if it's set to 'emitted',
                // closeLoggers() will skip this event, otherwise, closeLoggers()
                // may hang on this event until the process 'exit' kicks in.
                transportEvent.status = 'emitted';
              });
            } else if (this instanceof winston.transports.DailyRotateFile) {
              /*
               * https://github.com/winstonjs/winston-daily-rotate-file/blob/master/daily-rotate-file.js
               * DailyRotateFile.prototype.close = function () {
               *   var self = this;
               *   if (this.logStream) {
               *     this.logStream.end(function () {
               *       self.emit('finish');
               *     });
               *   }
               * };
               *
               * the code of DailyRotateFile.prototype.close shows it will emit
               * 'finish' event when logStream ends. so we just need to watch on
               * this.on('finish'):
               */
              this.once('finish', () => {
                // debug(`rotate.logStream finish, transport: ${transportName}`);
                debug(`logger[${name}]:transport[${transportName}] finished`);
                bus.emit(`transport-${transportName}-finish`);
                // if this event is emitted before closeLoggers() being called,
                // closeLoggers() should be informed about this situation, and
                // transportEvent.status is the way to do informing. this flag
                // will be checked in closeLogger(), if it's set to 'emitted',
                // closeLoggers() will skip this event, otherwise, closeLoggers()
                // may hang on this event until the process 'exit' kicks in.
                transportEvent.status = 'emitted';
              });
              /*
              this.logStream.once('finish', () => {
                debug(`rotate.logStream finish, transport: ${transportName}`);
                bus.emit(`${transportName}Finish`);
              });
              */
            }
          });
        }
        logger.add(transport);
        set(loggers, `${name}[transports][${transportName}]`, transport);
      }
    });
  }

  const loggerEvent = {
    event: `logger-${name}-finish`,
    status: 'listening',
  };
  events.push(loggerEvent);
  logger.once('finish', () => {
    debug(`logger[${name}] finished`);
    bus.emit(`logger-${name}-finish`);
    // loggerEvent.status does the same as transportEvent.status
    loggerEvent.status = 'emitted';
  });

  const proxyLogger = options.normalizeMessage ? proxy(logger) : logger;
  // the logger created later with options.pipeDebug = true
  // overrides the logger created earlier with options.pipeDebug = true
  if (options?.ndbgOptions?.pipeNdbg)
    pipeNdbg(proxyLogger, options.ndbgOptions);

  // loggers.set(name, logger);
  set(loggers, `${name}[logger]`, proxyLogger);
  set(loggers, `${name}[bus]`, bus);
  set(loggers, `${name}[events]`, events);

  if (watchList[name]) {
    watchList[name].forEach((fn) => fn(null, proxyLogger));
    delete watchList[name];
  }

  return proxyLogger;
}

function closeLoggers(callback) {
  // to make sure node.js debug is unhooked.
  unpipeNdbg();

  return new Promise((resolve, reject) => {
    asyncForEach(
      // loggers,
      Object.entries(loggers),
      // ([name, logger], cb) => {
      ([key, value], cb) => {
        Promise.all([
          ...value.events.map(({ event, status }) =>
            status === 'emitted'
              ? Promise.resolve()
              : new Promise((res, rej) => {
                  value.bus.once(event, res);
                })
          ),
        ])
          .then((v) => {
            // not to pass the [undefined, undefined, ...] to cb()
            cb();
          })
          .catch(cb);

        value.logger.end();
      },
      (err) => {
        if (err) {
          debug(`closeLoggers() failed, reason: ${err}`);
          // if callback parameter is provided, usually there is
          // no promise.then() or await outside, in this case,
          //   (resolve(err), callback(err))    // *
          // is better than
          //   (reject(err), callback(err)) // **
          // because way ** may trigger an uncaught rejection even
          // after the calling of callback(err), this is unacceptable
          callback ? (resolve(err), callback(err)) : reject(err);
        } else {
          debug(`closeLoggers() ends`);
          callback ? (resolve(), callback(null)) : resolve();
        }
      }
    );
  });
}

// only handle dynamic level setting for now
// TODO. dynamically modify other logger properties
function updateLoggers(options) {
  options &&
    Object.entries(options).forEach(([key, value]) => {
      if (!loggers[key]) return;

      if (value?.logger?.level) loggers[key].logger.level = value.logger.level;

      if (value?.transports && loggers[key].transports) {
        Object.entries(value.transports).forEach(([k, v]) => {
          if (!loggers[key].transports[k]) return;

          if (v?.level) loggers[key].transports[k].level = v.level;
        });
      }
    });
}

export { getLogger, updateLoggers, closeLoggers };
