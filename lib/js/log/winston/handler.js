import winston from 'winston';
import { EOL } from 'os';
import { stripAnsi } from '../../util/strip_ansi.js';
import { toString } from '../../util/object.js';
import { levels } from './level.js';

const colorizer = winston.format.colorize();

const maxLevelLength = Object.getOwnPropertyNames(levels).reduce((acc, cur) => {
  if (cur.length > acc) return cur.length;
  return acc;
}, 0);

function handleNewline({ ctrlNewline } = {}) {
  return winston.format((info, opts) => {
    const eol = ctrlNewline === true && info.newline !== false ? EOL : '';
    // appending eol to info.message doesn't work, the computed result
    // is saving in info[Symbol.for('message')] instead, and info.message
    // is just saving an outdated part result.
    // info.message += eol;
    info[Symbol.for('message')] += eol;
    return info;
  })();
}

// https://github.com/winstonjs/logform/blob/master/timestamp.js
/**
 * 1.use opts.format() to format timestamp if providing a
 * { format: function() {...} } option
 *
 * 2.use fecha.format(new Date(), opts.format) to format timestamp if
 * providing a { format: 'a timestamp string' } option, refer fecha at:
 *   https://github.com/taylorhakes/fecha
 *
 * 3.use info.timestamp = new Date().toISOString(); to format timestamp
 * if not providing a { format: ... } option
 */

function handleTimestamp({ timestamp } = {}) {
  return winston.format.timestamp({
    ...(timestamp && { format: timestamp }),
  });
}

function handleFilter({ filter } = {}) {
  if (!filter || typeof filter !== 'function')
    throw new Error('Unsupported filter');

  return winston.format((info, opts) => (filter(info) ? info : false))();
}

function handleMetadata({ metaKeys } = {}) {
  const keys = metaKeys || [
    'timestamp',
    'label',
    'level',
    'message',
    'showTimestamp',
    'showLabel',
    'showLevel',
    'showColon',
    'newline',
    'console',
    'file',
    'colorized', // to indicate the message has been pre-colorized before being delivered to winston
    // keepColor, source and namespace are mainly targeted at outside
    // logging systems like node.js debug, morgan etc.
    'keepColor', // prevent winston color scheme from overriding the original text color
    'source', // the source of the log, like ndbg or morgan
    'namespace', // the domain of the log, this is mainly for ndbg
  ];

  return winston.format.metadata({
    fillExcept: keys,
  });

  /*
  return winston.format.printf((info) => {
    const { timestamp, label, message } = info;
    const level = info[Symbol.for('level')];
    const args = info[Symbol.for('splat')];
    const strArgs = args.map(toString).join(' ');
    info[
      Symbol.for('message')
    ] = `${timestamp} [${label}] ${level}: ${message} ${strArgs}`;
    return info;
  });
  */

  /*
  return {
    transform(info) {
      const { timestamp, label, message } = info;
      const level = info[Symbol.for('level')];
      const args = info[Symbol.for('splat')];
      const strArgs = args.map(toString).join(' ');
      info[
        Symbol.for('message')
      ] = `${timestamp} [${label}] ${level}: ${message} ${strArgs}`;
      return info;
    },
  };
  */
}

function handleConsoleOutput({
  colorizeTimestamp,
  colorizeLabel,
  colorizeLevel,
  colorizeMessage,
  colorizeLine,
} = {}) {
  return winston.format.printf(
    /*
      ({ level, message, label, timestamp }) =>
        `${timestamp} [${label}] [${level}]: ${message}`
       */
    (info) => {
      if (info.console === false) return '';

      const colorize = colorizer.colorize.bind(
        colorizer,
        info[Symbol.for('level')]
      );

      let timestamp = '';
      if (info.showTimestamp !== false)
        timestamp = colorizeTimestamp
          ? `${colorize(info.timestamp)}`
          : `${info.timestamp}`;

      let label = '';
      if (info.showLabel !== false)
        label =
          (info.label &&
            (colorizeLabel
              ? `[${colorize(info.label)}]`
              : `[${info.label}]`)) ||
          '';

      let level = '';
      if (info.showLevel !== false)
        level = colorizeLevel
          ? `[${colorize(
              info[Symbol.for('level')].toUpperCase().padEnd(maxLevelLength)
            )}]`
          : `[${info[Symbol.for('level')]
              .toUpperCase()
              .padEnd(maxLevelLength)}]`;

      // colorize() has no effect on colorized string, so it leaves logs
      // piped from node.js debug module untouched (because those messages
      // have already been colorized). if we want options?.colorizeMessage
      // to pose an impact on info.message from node.js debug module, we
      // have to stripAnsi() them first. if we want to keep those colors
      // from node.js debug, just set options?.colorizeMessage to false,
      // but a a side effect is all those logs pruduced by winston itself
      // will have a uncolored message. that's why the flag colorizeNdbg
      // is introduced and info.colorizeNdbg has a higher priority.
      /*
      const message = options?.colorizeMessage
        ? `${colorize(stripAnsi(info.message))}`
        : `${info.message}`;
       */

      /*
      // to separate winston logs from others through info.source is
      // just for performance consideration
      let message;
      if (!info.source) {
        // for default logging source: winston logger
        message = colorizeMessage
          ? `${colorize(info.message)}`
          : `${info.message}`;
      } else {
        // for any other logging sources like ndbg, http, ...
        message =
          colorizeMessage && info.keepColor !== true
            ? `${colorize(stripAnsi(info.message))}`
            : `${info.message}`;
      }
      */
      // even for winston logger situation, we may have some pre-colorized
      // logs in some cases, not calling stripAnsi everywhere is for performance
      // consideration
      let message;
      if (info.message) {
        const formatted = toString(info.message);

        if (info.keepColor) {
          message = formatted;
        } else if (info.colorized) {
          const striped = stripAnsi(formatted);
          if (striped)
            message = colorizeMessage ? `${colorize(striped)}` : formatted;
        } else {
          message = colorizeMessage ? `${colorize(formatted)}` : formatted;
        }
      }

      let metadata;
      if (info.metadata && Object.keys(info.metadata).length > 0) {
        let formatted = toString(info.metadata);
        if (message) formatted = `, ${formatted}`;

        if (info.keepColor) {
          metadata = formatted;
        } else if (info.colorized) {
          const striped = stripAnsi(formatted);
          if (striped)
            metadata = colorizeMessage ? `${colorize(striped)}` : formatted;
        } else {
          metadata = colorizeMessage ? `${colorize(formatted)}` : formatted;
        }
      }

      // remove duplicated space, when label is undefined:
      // convert "[timestamp]  [level]" to "[timestamp] [level]"
      // but keep the padEnd spaces, for example, leave the spaces in
      // "[INFO  ]" untouched.
      let output = `${timestamp} ${label} ${level}`.replace(
        info.showLevel !== false ? /(\s)\s+(?=[^\]])/ : /(\s)\s+/,
        '$1'
      );
      if (output && info.showColon !== false) output += ': ';
      if (message) output += message;
      if (metadata) output += metadata;

      // any part cannot be double colorized, so stripped before colorize
      // again. colorizeLine has a higher priority than anything else
      if (colorizeLine) return colorize(`${stripAnsi(output)}`);
      return output;

      /*
        options?.colorizeLine ? colorizer.colorize(
              // Symbol.for('level') is necessary here to remove color escape
              // characters for the first parameter of colorizer.colorize()
              info[Symbol.for('level')],
              // Symbol.for('level') is necessary here to remove color escape
              // characters for [level], because colorizer.colorize will colorize
              // [level], we don't need duplicated colorization.
              `${info.timestamp} [${info.label}] [${info[Symbol.for('level')]
                .toUpperCase()
                .padEnd(maxLevelLength)}]: ${info.message}`
            )
          : // no symbol.for('level') here, we need color escape characters
            // to show correct colors for [level]
            `${info.timestamp} [${info.label}] [${info.level
              // .toUpperCase()
              .padEnd(maxLevelLength)}]: ${info.message}`;
        */
    }
  );
}

function handleFileOutput(options) {
  return winston.format.printf(
    // ({ level, message, label, timestamp }) =>
    //  `${timestamp} [${label}] ${level}: ${stripAnsi(message)}`
    (info) => {
      if (info.file === false) return '';

      const timestamp = info.showTimestamp !== false ? `${info.timestamp}` : '';
      const label =
        info.showLabel !== false ? (info.label && `[${info.label}]`) || '' : '';
      const level =
        info.showLevel !== false
          ? `[${info[Symbol.for('level')]
              .toUpperCase()
              .padEnd(maxLevelLength)}]`
          : '';

      /*
      let message;
      if (!info.source) {
        // for default logging source: winston logger
        message = info.message;
      } else {
        // for any other logging sources like ndbg, http, ...
        // we are not sure whether the message is colorized,
        // anyway, strip it first
        message = `${stripAnsi(info.message)}`;
      }
      */

      let message;
      if (info.message) {
        const formatted = toString(info.message);

        if (info.colorized) {
          message = `${stripAnsi(formatted)}`;
        } else {
          message = formatted;
        }
      }

      let metadata;
      if (info.metadata && Object.keys(info.metadata).length > 0) {
        let formatted = toString(info.metadata);
        if (message) formatted = `, ${formatted}`;

        if (info.colorized) {
          metadata = stripAnsi(formatted);
        } else {
          metadata = formatted;
        }
      }

      let output = `${timestamp} ${label} ${level}`.replace(
        info.showLevel !== false ? /(\s)\s+(?=[^\]])/ : /(\s)\s+/,
        '$1'
      );
      if (output && info.showColon !== false) output += ': ';

      if (message) output += message;
      if (metadata) output += metadata;

      return output;
    }
  );
}

export {
  handleNewline,
  handleFilter,
  handleTimestamp,
  handleMetadata,
  handleConsoleOutput,
  handleFileOutput,
};
