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

export const toNode = (value) => {
  if (value instanceof Node) {
    return value;
  }
  return new Node(value);
};

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

export const isJsonStart = (s) => {
  return RE_JSON_START.test(s);
};

/**
 * Deep compare of two objects for equality.
 * TODO: increase test coverage.
 */
export const deepEquals = (o1, o2) => {
  const left = new Map();
  const right = new Map();
  const has = Object.prototype.hasOwnProperty;
  const visit = (a, b) => {
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return a === b;
    }
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
    }
    if (left.has(a)) {
      return left.get(a) === b;
    }
    if (right.has(b)) {
      return right.get(b) === a;
    }
    for (const k in a) {
      if (has.call(a, k) && !has.call(b, k)) {
        return false;
      }
    }
    for (const k in b) {
      if (has.call(b, k) && !has.call(a, k)) {
        return false;
      }
    }
    left.set(a, b);
    right.set(b, a);
    for (const k in a) {
      if (has.call(a, k) && !visit(a[k], b[k])) {
        return false;
      }
    }
    return true;
  };
  return visit(o1, o2);
};

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

