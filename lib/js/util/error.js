// const util = require('util');
import { AssertionError } from 'assert';
import { extend } from './inherit.js';

if (!('toJSON' in Error.prototype))
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Error.prototype, 'toJSON', {
    value() {
      const alt = {};

      Object.getOwnPropertyNames(this).forEach(function copy(key) {
        alt[key] = this[key];
      }, this);

      // name is a prototype property, not an own one. it's also
      // very important and should be included in toJSON
      alt.name = this.name;
      return alt;
    },
    configurable: true,
    writable: true,
  });

// ========================================================
function MyError(message, code) {
  // Error has no internal properties like [[XXX]]
  // so Error.apply() also works, just like Reflect.construct.
  // Here using Reflect.construct to demo a general case
  // regarding extending any base, including those ones
  // having internal properties like [[XXX]].
  /* let _this = Error.apply(null, arguments); */

  // in a few cases, the statement:
  //   let _this = Reflect.construct(Error, arguments, MyError);
  // has the same result as this:
  //   let _this = Reflect.construct(Error, arguments);
  //   Reflect.setPrototypeOf(_this, Reflect.getPrototypeOf(this));
  // but it's not always the same, especially when the current
  // 'this' points to a derive of MyError, like new BufferError(),
  // in this case, the latter will get the correct object
  // instance, but the former will not. so, we should always
  // use the following:
  const _this = Reflect.construct(Error, [message]);
  Reflect.setPrototypeOf(_this, Reflect.getPrototypeOf(this));

  if (typeof code !== 'undefined') _this.code = code;

  // the stack info from here and above will not be included
  // in Error.stack. MyError() itself, and any calls invoked
  // by MyError() both will not show up in the Error.stack.
  // Refer to the official doc of node.js Error
  Error.captureStackTrace(_this, MyError);

  return _this;
}
// MyError.prototype = Object.create(Error.prototype);
// MyError.prototype.constructor = MyError;
extend(MyError, Error);

// must update prototype properties after extending, otherwise
// the updates will be overwritten.
// defining a MyError.prototype.name is better than defining
// a this.name in constructor. It will be shared by all instances.
// this is especially important for creating objects inheriting
// from Error. The MyError.prototype.name is available before
// entering into the constructor. This may have some impact on
// Error's internal behavior. Anyway, Error.prototype.name is
// also defined in prototype, not in ${this}. This rule also
// applys to:
//   BufferError.prototype.name
//   ParameterError.prototype.name
MyError.prototype.name = 'MyError';

// ========================================================
function BufferError(...args) {
  // the Function.apply() sometimes is better than Reflect.construct
  // in case we need to pass ${this} to base constructor
  /* let _this = Reflect.construct(MyError, arguments); */
  const _this = MyError.apply(this, args) || this;
  // for general purpose regarding inheritance, the following
  // if() block is necessary, but in this case, because we
  // use MyError.apply() to pass the ${this} to MyError()
  // constructor, and MyError() constructor will finish
  // the prototype chaning rectifying for all the derives
  // based on ${this} it gets from the derives.
  /*
  if (_this !== this) 
    Reflect.setPrototypeOf(_this, Reflect.getPrototypeOf(this));
  */

  // the stack info from here and above will not be included
  // in Error.stack. BufferError() itself, and any calls
  // invoked by BufferError() both will not show up in the
  // Error.stack. Refer to the official doc of node.js Error
  Error.captureStackTrace(_this, BufferError);
  return _this;
}
// util.inherits(BufferError, MyError);
extend(BufferError, MyError);

// must update prototype properties after extending, otherwise
// the updates will be overwritten
// defining a MyError.prototype.name is better than defining
// a this.name in constructor. It will be shared by all instances
BufferError.prototype.name = 'BufferError';

// ========================================================
function ParameterError(...args) {
  const _this = MyError.apply(this, args) || this;
  // refer to the comments in BufferError()
  /*
  if (_this !== this) 
    Reflect.setPrototypeOf(_this, Reflect.getPrototypeOf(this));
  */
  _this.status = 400;

  // the stack info from here and above will not be included
  // in Error.stack. ParameterError() itself, and any calls
  // invoked by ParameterError() both will not show up in the
  // Error.stack. Refer to the official doc of node.js Error
  Error.captureStackTrace(_this, ParameterError);
  return _this;
}

// util.inherits(ParameterError, MyError);
extend(ParameterError, MyError);

// must update prototype properties after extending, otherwise
// the updates will be overwritten
// defining a MyError.prototype.name is better than defining
// a this.name in constructor. It will be shared by all instances
ParameterError.prototype.name = 'ParameterError';

// ========================================================
function IntentionExit(...args) {
  const _this = MyError.apply(this, args) || this;

  _this.message = `${
    _this.message
      ? `@__INTENTION_EXIT__@, ${_this.message}`
      : `@__INTENTION_EXIT__@`
  }`;

  Error.captureStackTrace(_this, IntentionExit);
  return _this;
}

extend(IntentionExit, MyError);

IntentionExit.prototype.name = 'IntentionExit';

// ========================================================
function UnauthorizedError(...args) {
  const _this = MyError.apply(this, args) || this;
  _this.status = 401;
  Error.captureStackTrace(_this, UnauthorizedError);
  return _this;
}
extend(UnauthorizedError, MyError);
UnauthorizedError.prototype.name = 'UnauthorizedError';

// ========================================================
function ForbiddenError(...args) {
  const _this = MyError.apply(this, args) || this;
  _this.status = 403;
  Error.captureStackTrace(_this, ForbiddenError);
  return _this;
}
extend(ForbiddenError, MyError);
ForbiddenError.prototype.name = 'ForbiddenError';

// ========================================================
function InternalServerError(...args) {
  const _this = MyError.apply(this, args) || this;
  _this.status = 500;
  Error.captureStackTrace(_this, InternalServerError);
  return _this;
}
extend(InternalServerError, MyError);
InternalServerError.prototype.name = 'InternalServerError';

// ========================================================
function ConflictError(...args) {
  const _this = MyError.apply(this, args) || this;
  _this.status = 409;
  Error.captureStackTrace(_this, ConflictError);
  return _this;
}
extend(ConflictError, MyError);
ConflictError.prototype.name = 'ConflictError';

const errors = {
  // node.js error types
  /*
  Error,
  AssertionError,
  RangeError,
  ReferenceError,
  SyntaxError,
  // SystemError,
  TypeError,
  */

  // self defined error types
  MyError,
  BufferError,
  ParameterError,
  IntentionExit,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  ConflictError,
};

function createError(err) {
  const e = typeof err === 'object' && err !== null ? err : {};
  const { name, message } = e;

  if (!name || !errors[name]) return new Error(message);
  return new errors[name](message);
}

function formatError(err) {
  return [
    `Error: ${err?.message || '(no error message)'}`,
    err.stack || '  No stack trace',
  ].join('\n');
}

export {
  MyError,
  BufferError,
  ParameterError,
  IntentionExit,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  ConflictError,
  createError,
  formatError,
};
