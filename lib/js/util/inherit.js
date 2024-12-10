function extendStatics(derive, base) {
  if (Object.setPrototypeOf)
    // set derive.[[Prototype]] = base
    Object.setPrototypeOf(derive, base);
  else if ({ __proto__: [] } instanceof Array)
    // set derive.[[Prototype]] to base
    // eslint-disable-next-line no-proto
    derive.__proto__ = base;
  else {
    // no easy way to inherit from base, just copy all of its own properties
    for (const property in base) {
      // eslint-disable-next-line no-prototype-builtins
      if (base.hasOwnProperty(property)) derive[property] = base[property];
    }
  }
}

export function extend(derive, base) {
  if (typeof base !== 'function' && base !== null)
    throw new TypeError(
      `Class extends value ${String(base)} is not a constructor or null`
    );
  extendStatics(derive, base);
  // function __() { this.constructor = derive; }
  // derive.prototype = base === null ? Object.create(base) : (__.prototype = base.prototype, new __());
  if (base === null) derive.property = Object.create(null);
  else {
    // eslint-disable-next-line no-inner-declarations
    function __Proto() {
      this.constructor = derive;
    }
    __Proto.prototype = base.prototype;
    derive.prototype = new __Proto();
  }
}
