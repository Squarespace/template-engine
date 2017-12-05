import types from './types';
import { deepEquals, stringCompare } from './util';

// Forward declaration
let MISSING_NODE = null;

/**
 * Note: This converts a value to a boolean using the Jackson JSON rules.
 * For example, string "true" is true, all else false. For this reason
 * we do not expose it publically. It is only used for comparisons.
 */
const asBoolean = (n) => {
  const value = n.value;
  switch (n.type) {
  case types.BOOLEAN:
    return value;
  case types.STRING:
    return value === 'true' ? true : false;
  case types.NUMBER:
    // Only non-zero integers are true, floats are false.
    return parseInt(value, 10) === value ? value !== 0 : false;
  default:
    return false;
  }
};

/**
 * Wrapper for a typed value with some utility methods.
 */
class Node {

  constructor(value, type) {
    this.value = value;
    this.type = typeof type === 'undefined' ? types.of(value) : type;
  }

  isNull() {
    return this.type === types.NULL;
  }

  isMissing() {
    return this.type === types.MISSING;
  }

  equals(other) {
    const value = other instanceof Node ? other.value : other;
    return deepEquals(this.value, value);
  }

  compare(other) {
    const node = other instanceof Node ? other : new Node(other);
    switch (this.type) {
    case types.NUMBER:
    {
      const n = node.asNumber();
      return this.value < n ? -1 : ((this.value === n) ? 0 : 1);
    }

    case types.STRING:
      return stringCompare(this.value, node.asString());

    case types.BOOLEAN:
    {
      const n = asBoolean(node);
      return this.value === n ? 0 : (this.value ? 1 : -1);
    }

    default:
      return deepEquals(this.value, node.value) ? 0 : -1;
    }
  }

  /**
   * Return the node's value as a string.
   */
  asString() {
    switch (this.type) {
    case types.STRING:
      return this.value;

    case types.NULL:
    case types.MISSING:
      return '';

    case types.NUMBER:
    case types.BOOLEAN:
      return String(this.value);

    default:
      return JSON.stringify(this.value);
    }
  }

  /**
   * Return the node's value as a number, converting where needed.
   */
  asNumber() {
    switch (this.type) {
    case types.NUMBER:
      return this.value;
    case types.STRING:
      if (this.value.indexOf('.') !== -1) {
        return parseFloat(this.value, 10);
      }
      return parseInt(this.value, 10);
    case types.BOOLEAN:
      return this.value ? 1 : 0;
    default:
      return 0;
    }
  }

  replace(mapping) {
    const s = this.asString();
    const len = s.length;
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = s[i];
      const repl = mapping[ch];
      out += repl ? repl : ch;
    }
    return out;
  }

  path(path) {
    let value = this.value;
    let type = this.type;
    for (let i = 0, len = path.length; i < len; i++) {
      const name = path[i];
      if (type !== types.OBJECT && type !== types.ARRAY) {
        return MISSING_NODE;
      }
      value = value[name];
      type = types.of(value);
    }
    if (type === types.MISSING) {
      return MISSING_NODE;
    }
    return new Node(value, type);
  }

  get(key) {
    const value = this.value[key];
    const type = types.of(value);
    if (type === types.MISSING) {
      return MISSING_NODE;
    }
    return new Node(value, type);
  }
}

/**
 * Represents a missing node, or a non-value type.
 */
class MissingNode extends Node {

  constructor() {
    super(null, types.MISSING);
  }

  path(path) {
    return MISSING_NODE;
  }

  get(key) {
    return MISSING_NODE;
  }

}

// Singleton, used any time we need to return a missing node
MISSING_NODE = new MissingNode();

export {
  Node,
  MISSING_NODE,
};
