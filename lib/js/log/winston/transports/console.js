// for demo purpose, not used at this moment

import Transport from 'winston-transport';
import { extend } from '../../../util/inherit.js';

function Console(options) {
  const _this = Transport.call(this, options) || this;
  if (_this !== this)
    Reflect.setPrototypeOf(_this, Reflect.getPrototypeOf(this));

  _this.newline = options.newline;

  return _this;
}

extend(Console, Transport);

Console.prototype.log = function consoleLog(info, callback) {
  setImmediate(() => {
    this.emit('logged', info);
  });

  process.stdout.write(info.toString());

  // Perform the writing to the remote service
  callback();
};
