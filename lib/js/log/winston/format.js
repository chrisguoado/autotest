import winston from 'winston';
import 'winston-daily-rotate-file';
import {
  handleNewline,
  handleTimestamp,
  handleFilter,
  handleMetadata,
  handleConsoleOutput,
  handleFileOutput,
} from './handler.js';

// cannot define ctrlNewline and call handleNewline() in general part,
// the console colorization will make a mess then.
function generalFormat({ filter, label, splat, timestamp } = {}) {
  let args = [];

  if (filter) args = [...args, handleFilter({ filter })];
  if (label) args = [...args, winston.format.label({ label })];
  // define splat either in parent level or transport level. however,
  // defining splat in both level seems not to make sense.
  if (splat) args = [...args, winston.format.splat()];
  args = [...args, handleTimestamp({ timestamp })];

  args = [...args, handleMetadata()];

  return winston.format.combine(...args);
}

function consoleFormat({
  filter,
  splat,
  timestamp,
  ctrlNewline,
  ...options
} = {}) {
  let args = [];

  if (filter) args = [...args, handleFilter({ filter })];
  // define splat either in parent level or transport level. however,
  // defining splat in both level seems not to make sense.
  if (splat) args = [...args, winston.format.splat()];
  if (timestamp) args = [...args, handleTimestamp({ timestamp })];

  /*
  args = [
    ...args,

    // winston.format.timestamp(),
    // winston.format.colorize({ all: !!options?.colorizeAll }),
    // normalizeLevel(options.level),
  ];
  */
  args = [...args, handleConsoleOutput(options)];

  // appending newling should be placed after the colorization, otherwise
  // the colorization makes a mess.
  if (ctrlNewline) args = [...args, handleNewline({ ctrlNewline })];

  return winston.format.combine(...args);
}

function fileFormat({
  filter,
  splat,
  timestamp,
  ctrlNewline,
  ...options
} = {}) {
  let args = [];

  if (filter) args = [...args, handleFilter({ filter })];
  // define splat either in parent level or transport level. however,
  // defining splat in both level seems not to make sense.
  if (splat) args = [...args, winston.format.splat()];
  if (timestamp) args = [...args, handleTimestamp({ timestamp })];

  /*
  args = [
    ...args,

    // winston.format.uncolorize(),
    // winston.format.timestamp(),
    // normalizeLevel(options.level),
  ];
  */
  args = [...args, handleFileOutput(options)];

  if (ctrlNewline) args = [...args, handleNewline({ ctrlNewline })];

  return winston.format.combine(...args);
}

export default {
  general: { format: generalFormat, Transport: undefined },
  console: { format: consoleFormat, Transport: winston.transports.Console },
  file: { format: fileFormat, Transport: winston.transports.File },
  rotate: { format: fileFormat, Transport: winston.transports.DailyRotateFile },
};
