const { hasOwnProperty } = Object.prototype;

function copyOwnProperties(target, source) {
  Object.getOwnPropertyNames(source).forEach((propKey) => {
    const desc = Object.getOwnPropertyDescriptor(source, propKey);
    Object.defineProperty(target, propKey, desc);
  });
  return target;
}

function removeProperties(obj, regex) {
  Object.keys(obj).forEach((key) => {
    if (!regex || (regex && regex.test(key))) delete obj[key];
  });
}

// https://stackoverflow.com/questions/19293321/opposite-of-object-freeze-or-object-seal-in-javascript/26752410#26752410
function unfreeze(obj) {
  let ret;
  if (obj instanceof Array) {
    ret = [];
    // eslint-disable-next-line func-names
    const clone = function (v) {
      ret.push(v);
    };
    obj.forEach(clone);
  } else if (obj instanceof String) {
    // eslint-disable-next-line no-new-wrappers
    ret = new String(obj).toString();
  } else if (typeof obj === 'object') {
    ret = {};
    copyOwnProperties(ret, obj);
  }
  return ret;
}

// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
const get = (obj, path, defaultValue = undefined) => {
  const travel = (regexp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

// https://stackoverflow.com/questions/54733539/javascript-implementation-of-lodash-set-method
const set = (obj, path, value) => {
  if (Object(obj) !== obj) return obj; // When obj is not an object
  // If not yet an array, get the keys from the string-path
  if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
  path.slice(0, -1).reduce(
    (
      a,
      c,
      i // Iterate all of them except the last one
    ) =>
      Object(a[c]) === a[c] // Does the key exist and is its value an object?
        ? // Yes: then follow that path
          a[c]
        : // No: create the key. Is the next key a potential array-index?
          (a[c] =
            Math.abs(path[i + 1]) >> 0 === +path[i + 1]
              ? [] // Yes: assign a new array object
              : {}), // No: assign a new plain object
    obj
  )[path[path.length - 1]] = value; // Finally assign the value to the last key
  return obj; // Return the top-level object to allow chaining
};

const toString = (obj) => {
  if (typeof obj === 'string') return obj;

  if (obj instanceof Error)
    return [
      `Error: ${obj?.message || '(no error message)'}`,
      obj.stack || '  No stack trace',
    ].join('\n');

  return JSON.stringify(obj, null, 2);
};

const compare = (obj1, obj2) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every(
    (key) => hasOwnProperty.call(obj2, key) && obj1[key] === obj2[key]
  );

export { copyOwnProperties, removeProperties, unfreeze, get, set, toString };
