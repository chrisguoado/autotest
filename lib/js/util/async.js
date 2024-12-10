import createDebug from 'debug';

const debug = createDebug('lib:util:async');

function acall(fn, ...args) {
  return (async () => {
    // await fn.apply(null, args);
    fn(args);
  })();
}

/**
 * if fn is defined, it should follow the signature of:
 *   async function fn(cur, last)
 * cur is the current iterating item of the array
 * last is the returned value from fn(lastItem)
 *
 * if fn is not defined, array should be an array of
 * function, and each element has a signature of:
 *   async function fn(last)
 */
async function waterfall(array, fn) {
  if (!Array.isArray(array)) throw new Error('array is not an Array');

  return array.reduce(async (acc, cur) => {
    const last = await acc;

    debug(`cur in waterfall: ${JSON.stringify(cur, null, 2)}`);
    debug(`last return in waterfall: ${JSON.stringify(last, null, 2)}`);

    let result;
    if (fn) result = await fn(cur, last);
    else if (typeof cur === 'function') result = await cur(last);
    else throw new Error('fn not defined and array is not a function array');

    return result;
  }, Promise.resolve());
}

/**
 * if fn is defined, it should follow the signature of:
 *   async function fn(cur)
 * cur is the current iterating item of the array
 *
 * if fn is not defined, array should be an array of
 * function, and each element has a signature of:
 *   async function fn()
 */
async function parallel(array, fn) {
  if (!Array.isArray(array)) throw new Error('array is not an Array');
  return Promise.all(
    array.map(async (cur) => {
      let result;
      if (fn) {
        result = await fn(cur);
      } else if (typeof cur === 'function') {
        result = await cur();
      } else {
        throw new Error(
          `fn not defined and current element is not a function: ${cur}`
        );
      }
      return result;
    })
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// atomics sleep, block the event loop
function asleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

export { acall, waterfall, parallel, sleep, asleep };
