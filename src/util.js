import Node from './node';
import * as OP from './opcodes';
import types from './types';

const ALL_DIGITS = /\d+/;


/**
 * Split a variable reference into parts. This forms a path that
 * will be used to resolve against a context. Digit components of
 * the path are converted to numbers.
 */
export const splitVariable = (name) => {
  const parts = name.split('.');
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i];
    if (ALL_DIGITS.test(part)) {
      parts[i] = parseInt(part, 10);
    }
  }
  return parts;
};


/**
 * Wrap a value in a Node if not already.
 */
export const toNode = (value) => {
  return value instanceof Node ? value : new Node(value);
};


/**
 * Returns true or false indicating the value is "truthy" per the
 * template compiler's rules.
 */
export const isTruthy = (n) => {
  const node = toNode(n);
  const value = node.value;
  switch (node.type) {
  case types.STRING:
    return value !== '';
  case types.NUMBER:
    return value !== 0;
  case types.BOOLEAN:
    return value;
  case types.OBJECT:
    return Object.keys(value).length !== 0 || value.constructor !== Object;
  case types.ARRAY:
    return value.length !== 0;
  case types.MISSING:
  case types.NULL:
  default:
    return false;
  }
};


const RE_JSON_START = /^[\"\d\[\{]|^-\d|^(true|false|null)$/;

/**
 * Return true if the string starts with a value JSON character or value.
 */
export const isJsonStart = (s) => {
  return RE_JSON_START.test(s);
};


/**
 * Deep compare of two objects for equality.
 *
 * Note: this is not general-purpose. It is intended to deeply-compare
 * valid JSON types. For example it cannot determine equality of Date objects.
 */
 /*eslint complexity: ["error", 30]*/
export const deepEquals = (o1, o2) => {
  const seen = new Map();
  const visit = (a, b) => {
    // Number, string, boolean, null, undefined can be compared using ===
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return a === b;
    }

    // Ensure objects are of same type.
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
    }

    // Detect reference cycle.
    if (seen.has(a)) {
      return seen.get(a) === b;
    }

    // Mark these objects as seen.
    seen.set(a, b);
    seen.set(b, a);

    if (Array.isArray(a)) {
      // Array lengths must be equal.
      const len = a.length;
      if (len !== b.length) {
        return false;
      }

      // Compare elements of arrays.
      for (let i = 0; i < len; i++) {
        if (!visit(a[i], b[i])) {
          return false;
        }
      }

    } else {
      // Compare keys across both objects.
      for (const k in a) {
        if (!visit(a[k], b[k])) {
          return false;
        }
      }
      for (const k in b) {
        if (!visit(a[k], b[k])) {
          return false;
        }
      }
    }

    return true;
  };
  return visit(o1, o2);
};


/**
 * Returns an integer indicating:
 *
 *  -N   left < right
 *   0   left == right
 *  +N   left > right
 */
export const stringCompare = (s1, s2) => {
  const len1 = s1.length;
  const len2 = s2.length;
  const lim = Math.min(len1, len2);
  let k = 0;
  while (k < lim) {
    const c1 = s1.charCodeAt(k);
    const c2 = s2.charCodeAt(k);
    if (c1 !== c2) {
      return c1 - c2;
    }
    k++;
  }
  return len1 - len2;
};


/**
 * Execute an instruction against the current context, capturing the output
 * and returning it. If privateContext is true variable resolution will be
 * blocked at the current stack frame.
 */
export const executeTemplate = (ctx, inst, node, privateContext) => {
  const buf = ctx.swapBuffer();
  ctx.pushNode(node);
  ctx.stopResolution(privateContext);

  if (inst.length >= 1 && inst[0] === OP.ROOT) {
    // Partials will be a full template including a ROOT instruction.
    ctx.engine.execute(inst, ctx);
  } else {
    // Macros are inline blocks.
    ctx.engine.executeBlock(inst, ctx);
  }

  const text = ctx.render();
  ctx.pop();
  ctx.restoreBuffer(buf);
  return text;
};

